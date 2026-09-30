package com.alstjrzzz.ecallipse.call;

import com.alstjrzzz.ecallipse.realtime.CallEventPublisher;
import com.alstjrzzz.ecallipse.realtime.UserEventPublisher;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class TranscriptApplicationServiceTest {
    private final Clock clock = Clock.fixed(Instant.parse("2026-09-20T01:00:00Z"), ZoneOffset.UTC);
    private final RecordingEvents events = new RecordingEvents();
    private final CallApplicationService calls = new CallApplicationService(
            events,
            events,
            userId -> true,
            (userId, call) -> { },
            (call, onAnswered) -> { },
            clock
    );
    private final List<Runnable> queuedAssistance = new ArrayList<>();
    private final TranscriptApplicationService transcripts = new TranscriptApplicationService(
            calls,
            events,
            new DeterministicNextActionGenerator(clock),
            clock,
            queuedAssistance::add
    );

    private UUID callId;

    @BeforeEach
    void activeCall() {
        callId = calls.create("alice", CallDestination.internalUser("bob")).id();
        calls.accept(callId, "bob");
        events.clear();
    }

    @Test
    void preservesSegmentOrderingAndGeneratesAssistanceForFinalRevision() {
        transcripts.submit(callId, input("second", 2, 0, false, "부분 문장"));
        TranscriptApplicationService.TranscriptResult result = transcripts.submit(
                callId,
                input("first", 1, 0, true, "내일까지 견적서를 회신하기")
        );

        assertThat(transcripts.list(callId))
                .extracting(TranscriptSegment::segmentId)
                .containsExactly("first", "second");
        runQueuedAssistance();
        assertThat(result.segment().segmentId()).isEqualTo("first");
        assertThat(((NextAction) events.lastPayload("assistance.next-action")).text())
                .isEqualTo("확인할 다음 행동: 내일까지 견적서를 회신하기");
        assertThat(events.types()).containsExactly(
                "transcript.updated",
                "transcript.updated",
                "assistance.next-action"
        );
    }

    @Test
    void treatsAnIdenticalRevisionAsIdempotent() {
        TranscriptApplicationService.TranscriptInput input = input("one", 1, 0, true, "다시 연락하기");
        transcripts.submit(callId, input);
        runQueuedAssistance();
        events.clear();

        TranscriptApplicationService.TranscriptResult duplicate = transcripts.submit(callId, input);

        assertThat(duplicate.duplicate()).isTrue();
        runQueuedAssistance();
        assertThat(events.types()).isEmpty();
    }

    @Test
    void rejectsAnOlderRevision() {
        transcripts.submit(callId, input("one", 1, 2, false, "최신 문장"));

        assertThatThrownBy(() -> transcripts.submit(callId, input("one", 1, 1, false, "과거 문장")))
                .isInstanceOf(TranscriptApplicationService.InvalidTranscriptException.class)
                .hasMessage("transcript revision cannot move backwards");
    }

    @Test
    void aFinalSegmentCannotReturnToPartial() {
        transcripts.submit(callId, input("one", 1, 0, true, "확정 문장"));

        assertThatThrownBy(() -> transcripts.submit(callId, input("one", 1, 1, false, "바뀐 문장")))
                .isInstanceOf(TranscriptApplicationService.InvalidTranscriptException.class)
                .hasMessage("a final transcript cannot return to partial");
    }

    @Test
    void rejectsTranscriptOutsideAnActiveCall() {
        calls.hangup(callId, "alice");

        assertThatThrownBy(() -> transcripts.submit(callId, input("one", 1, 0, true, "늦은 문장")))
                .isInstanceOf(CallApplicationService.InvalidCallOperationException.class);
    }

    @Test
    void speechResultsGetServerAssignedSequenceAndRevision() {
        transcripts.recordSpeech(callId, "alice", "a-0", "안녕", false);
        transcripts.recordSpeech(callId, "bob", "b-0", "네 안녕하세요", true);
        TranscriptApplicationService.TranscriptResult result = transcripts.recordSpeech(callId, "alice", "a-0", "안녕하세요", true);

        assertThat(result.segment().sequence()).isZero();
        assertThat(result.segment().revision()).isEqualTo(1);
        runQueuedAssistance();
        assertThat(events.types()).contains("assistance.next-action");
        assertThat(transcripts.list(callId))
                .extracting(TranscriptSegment::segmentId, TranscriptSegment::sequence)
                .containsExactly(org.assertj.core.groups.Tuple.tuple("a-0", 0L), org.assertj.core.groups.Tuple.tuple("b-0", 1L));
    }

    @Test
    void finalsArrivingDuringGenerationCollapseIntoOneActionForTheLatest() {
        transcripts.submit(callId, input("one", 1, 0, true, "견적서 보내기"));
        transcripts.submit(callId, input("two", 2, 0, true, "화요일에 다시 통화하기"));

        assertThat(queuedAssistance).hasSize(1);
        runQueuedAssistance();

        assertThat(events.types()).filteredOn("assistance.next-action"::equals).hasSize(1);
        assertThat(((NextAction) events.lastPayload("assistance.next-action")).sourceSegmentId()).isEqualTo("two");
    }

    private void runQueuedAssistance() {
        List<Runnable> tasks = List.copyOf(queuedAssistance);
        queuedAssistance.clear();
        tasks.forEach(Runnable::run);
    }

    private TranscriptApplicationService.TranscriptInput input(
            String segmentId,
            long sequence,
            int revision,
            boolean finalSegment,
            String text
    ) {
        return new TranscriptApplicationService.TranscriptInput(
                segmentId,
                sequence,
                revision,
                "alice",
                text,
                finalSegment
        );
    }

    private static final class RecordingEvents implements CallEventPublisher, UserEventPublisher {
        private final List<String> types = new ArrayList<>();
        private final List<Object> payloads = new ArrayList<>();

        @Override
        public void publish(UUID callId, String type, Object payload) {
            types.add(type);
            payloads.add(payload);
        }

        @Override
        public void publishToUser(String userId, UUID callId, String type, Object payload) {
            types.add(type);
            payloads.add(payload);
        }

        List<String> types() {
            return List.copyOf(types);
        }

        Object lastPayload(String type) {
            return payloads.get(types.lastIndexOf(type));
        }

        void clear() {
            types.clear();
            payloads.clear();
        }
    }
}
