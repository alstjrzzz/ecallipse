package com.alstjrzzz.ecallipse.call;

import com.alstjrzzz.ecallipse.realtime.CallEventPublisher;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.Clock;
import java.time.Instant;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executor;
import java.util.concurrent.Executors;

@Service
public class TranscriptApplicationService {
    private static final Logger log = LoggerFactory.getLogger(TranscriptApplicationService.class);

    private final Map<UUID, Map<String, TranscriptSegment>> segmentsByCall = new ConcurrentHashMap<>();
    private final Map<UUID, AssistanceState> assistanceByCall = new ConcurrentHashMap<>();
    private final CallApplicationService calls;
    private final CallEventPublisher events;
    private final NextActionGenerator nextActions;
    private final Clock clock;
    private final Executor assistanceExecutor;

    @Autowired
    public TranscriptApplicationService(
            CallApplicationService calls,
            CallEventPublisher events,
            NextActionGenerator nextActions,
            Clock clock
    ) {
        // LLM calls take seconds, so they run off the request and lock path.
        this(calls, events, nextActions, clock, Executors.newVirtualThreadPerTaskExecutor());
    }

    TranscriptApplicationService(
            CallApplicationService calls,
            CallEventPublisher events,
            NextActionGenerator nextActions,
            Clock clock,
            Executor assistanceExecutor
    ) {
        this.calls = calls;
        this.events = events;
        this.nextActions = nextActions;
        this.clock = clock;
        this.assistanceExecutor = assistanceExecutor;
    }

    public TranscriptResult submit(UUID callId, TranscriptInput input) {
        return calls.whileActive(callId, () -> submitWhileActive(callId, input));
    }

    /**
     * Records a live STT result. The server owns sequence and revision here: a new segment takes the next
     * sequence in the call, and every update of the same segment bumps its revision.
     */
    public TranscriptResult recordSpeech(UUID callId, String speakerId, String segmentId, String text, boolean finalSegment) {
        return calls.whileActive(callId, () -> {
            Map<String, TranscriptSegment> callSegments = segmentsByCall.computeIfAbsent(callId, ignored -> new HashMap<>());
            synchronized (callSegments) {
                TranscriptSegment existing = callSegments.get(segmentId);
                long sequence = existing != null
                        ? existing.sequence()
                        : callSegments.values().stream().mapToLong(TranscriptSegment::sequence).max().orElse(-1) + 1;
                int revision = existing == null ? 0 : existing.revision() + 1;
                return submitWhileActive(callId, new TranscriptInput(segmentId, sequence, revision, speakerId, text, finalSegment));
            }
        });
    }

    private TranscriptResult submitWhileActive(UUID callId, TranscriptInput input) {
        Map<String, TranscriptSegment> callSegments = segmentsByCall.computeIfAbsent(callId, ignored -> new HashMap<>());
        synchronized (callSegments) {
            TranscriptSegment existing = callSegments.get(input.segmentId());
            validateRevision(existing, input);
            validateSequenceOwner(callSegments, input);

            if (existing != null && sameContent(existing, input)) {
                return new TranscriptResult(existing, true);
            }

            TranscriptSegment segment = new TranscriptSegment(
                    callId,
                    input.segmentId(),
                    input.sequence(),
                    input.revision(),
                    input.speakerId(),
                    input.text(),
                    input.finalSegment(),
                    Instant.now(clock)
            );
            callSegments.put(segment.segmentId(), segment);

            events.publish(callId, "transcript.updated", segment);
            if (segment.finalSegment()) {
                requestNextAction(callId, segment);
            }
            return new TranscriptResult(segment, false);
        }
    }

    /**
     * At most one generation runs per call. A final segment that arrives meanwhile is queued, and a result
     * that was overtaken by a newer final segment is dropped instead of published.
     */
    private void requestNextAction(UUID callId, TranscriptSegment source) {
        AssistanceState state = assistanceByCall.computeIfAbsent(callId, ignored -> new AssistanceState());
        synchronized (state) {
            state.latestSource = source;
            if (state.running) return;
            state.running = true;
        }
        assistanceExecutor.execute(() -> generateNextActions(callId, state));
    }

    private void generateNextActions(UUID callId, AssistanceState state) {
        while (true) {
            TranscriptSegment source;
            synchronized (state) {
                source = state.latestSource;
                state.latestSource = null;
                if (source == null) {
                    state.running = false;
                    return;
                }
            }
            try {
                NextAction nextAction = nextActions.generate(source, list(callId));
                boolean overtaken;
                synchronized (state) {
                    overtaken = state.latestSource != null;
                }
                if (nextAction != null && !overtaken) {
                    events.publish(callId, "assistance.next-action", nextAction);
                }
            } catch (RuntimeException exception) {
                log.warn("Next Action generation failed for call {}: {}", callId, exception.getMessage());
            }
        }
    }

    private static final class AssistanceState {
        private boolean running;
        private TranscriptSegment latestSource;
    }

    public List<TranscriptSegment> list(UUID callId) {
        calls.get(callId);
        Map<String, TranscriptSegment> callSegments = segmentsByCall.get(callId);
        if (callSegments == null) {
            return List.of();
        }
        synchronized (callSegments) {
            return callSegments.values().stream()
                    .sorted(Comparator.comparingLong(TranscriptSegment::sequence))
                    .toList();
        }
    }

    private void validateRevision(TranscriptSegment existing, TranscriptInput input) {
        if (existing == null) {
            return;
        }
        if (input.revision() < existing.revision()) {
            throw new InvalidTranscriptException("transcript revision cannot move backwards");
        }
        if (input.revision() == existing.revision() && !sameContent(existing, input)) {
            throw new InvalidTranscriptException("the same transcript revision cannot have different content");
        }
        if (input.sequence() != existing.sequence()) {
            throw new InvalidTranscriptException("transcript sequence cannot change between revisions");
        }
        if (!input.speakerId().equals(existing.speakerId())) {
            throw new InvalidTranscriptException("transcript speaker cannot change between revisions");
        }
        if (existing.finalSegment() && !input.finalSegment()) {
            throw new InvalidTranscriptException("a final transcript cannot return to partial");
        }
    }

    private void validateSequenceOwner(Map<String, TranscriptSegment> segments, TranscriptInput input) {
        boolean occupied = segments.values().stream()
                .anyMatch(segment -> segment.sequence() == input.sequence()
                        && !segment.segmentId().equals(input.segmentId()));
        if (occupied) {
            throw new InvalidTranscriptException("transcript sequence is already used by another segment");
        }
    }

    private boolean sameContent(TranscriptSegment existing, TranscriptInput incoming) {
        return existing.sequence() == incoming.sequence()
                && existing.revision() == incoming.revision()
                && existing.speakerId().equals(incoming.speakerId())
                && existing.text().equals(incoming.text())
                && existing.finalSegment() == incoming.finalSegment();
    }

    public record TranscriptInput(
            String segmentId,
            long sequence,
            int revision,
            String speakerId,
            String text,
            boolean finalSegment
    ) {
    }

    public record TranscriptResult(TranscriptSegment segment, boolean duplicate) {
    }

    public static class InvalidTranscriptException extends RuntimeException {
        public InvalidTranscriptException(String message) {
            super(message);
        }
    }
}
