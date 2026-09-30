package com.alstjrzzz.ecallipse.call;

import com.alstjrzzz.ecallipse.realtime.CallEventPublisher;
import org.springframework.stereotype.Service;

import java.time.Clock;
import java.time.Instant;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class TranscriptApplicationService {
    private final Map<UUID, Map<String, TranscriptSegment>> segmentsByCall = new ConcurrentHashMap<>();
    private final CallApplicationService calls;
    private final CallEventPublisher events;
    private final NextActionGenerator nextActions;
    private final Clock clock;

    public TranscriptApplicationService(
            CallApplicationService calls,
            CallEventPublisher events,
            NextActionGenerator nextActions,
            Clock clock
    ) {
        this.calls = calls;
        this.events = events;
        this.nextActions = nextActions;
        this.clock = clock;
    }

    public TranscriptResult submit(UUID callId, TranscriptInput input) {
        return calls.whileActive(callId, () -> submitWhileActive(callId, input));
    }

    private TranscriptResult submitWhileActive(UUID callId, TranscriptInput input) {
        Map<String, TranscriptSegment> callSegments = segmentsByCall.computeIfAbsent(callId, ignored -> new HashMap<>());
        synchronized (callSegments) {
            TranscriptSegment existing = callSegments.get(input.segmentId());
            validateRevision(existing, input);
            validateSequenceOwner(callSegments, input);

            if (existing != null && sameContent(existing, input)) {
                return new TranscriptResult(existing, null, true);
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
            NextAction nextAction = null;
            if (segment.finalSegment()) {
                nextAction = nextActions.generate(segment);
                events.publish(callId, "assistance.next-action", nextAction);
            }
            return new TranscriptResult(segment, nextAction, false);
        }
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

    public record TranscriptResult(TranscriptSegment segment, NextAction nextAction, boolean duplicate) {
    }

    public static class InvalidTranscriptException extends RuntimeException {
        public InvalidTranscriptException(String message) {
            super(message);
        }
    }
}
