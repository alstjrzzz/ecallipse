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
    private final TranscriptApplicationService transcripts = new TranscriptApplicationService(
            calls,
            events,
            new DeterministicNextActionGenerator(clock),
            clock
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
        assertThat(result.nextAction().text()).isEqualTo("확인할 다음 행동: 내일까지 견적서를 회신하기");
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
        events.clear();

        TranscriptApplicationService.TranscriptResult duplicate = transcripts.submit(callId, input);

        assertThat(duplicate.duplicate()).isTrue();
        assertThat(duplicate.nextAction()).isNull();
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

        @Override
        public void publish(UUID callId, String type, Object payload) {
            types.add(type);
        }

        @Override
        public void publishToUser(String userId, UUID callId, String type, Object payload) {
            types.add(type);
        }

        List<String> types() {
            return List.copyOf(types);
        }

        void clear() {
            types.clear();
        }
    }
}
