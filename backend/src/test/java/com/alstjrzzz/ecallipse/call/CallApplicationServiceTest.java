package com.alstjrzzz.ecallipse.call;

import com.alstjrzzz.ecallipse.realtime.CallEventPublisher;
import com.alstjrzzz.ecallipse.realtime.UserEventPublisher;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class CallApplicationServiceTest {
    private final RecordingEvents events = new RecordingEvents();
    private final Set<String> onlineUsers = new HashSet<>(Set.of("bob"));
    private final List<String> pushed = new ArrayList<>();
    private final List<Runnable> dialed = new ArrayList<>();
    private final CallApplicationService calls = new CallApplicationService(
            events,
            events,
            onlineUsers::contains,
            (userId, call) -> pushed.add(userId),
            (call, onAnswered) -> dialed.add(onAnswered),
            Clock.fixed(Instant.parse("2026-09-20T01:00:00Z"), ZoneOffset.UTC)
    );

    @Test
    void movesThroughTheMinimalCallLifecycle() {
        CallSession ringing = calls.create("alice", CallDestination.internalUser("bob"));
        CallSession active = calls.accept(ringing.id(), "bob");
        CallSession ended = calls.hangup(ringing.id(), "alice");

        assertThat(ringing.status()).isEqualTo(CallStatus.RINGING);
        assertThat(active.status()).isEqualTo(CallStatus.ACTIVE);
        assertThat(ended.status()).isEqualTo(CallStatus.ENDED);
        assertThat(events.types()).containsExactly("call.ringing", "call.incoming", "call.active", "call.ended");
    }

    @Test
    void onlyTheCalleeCanAccept() {
        UUID callId = calls.create("alice", CallDestination.internalUser("bob")).id();

        assertThatThrownBy(() -> calls.accept(callId, "alice"))
                .isInstanceOf(CallApplicationService.CallAccessDeniedException.class)
                .hasMessage("only the callee can accept this call");
    }

    @Test
    void reachesAnOnlineUserInTheAppWithoutPush() {
        CallSession call = calls.create("alice", CallDestination.internalUser("bob"));

        assertThat(call.delivery()).isEqualTo(CallDelivery.APP_REALTIME);
        assertThat(pushed).isEmpty();
    }

    @Test
    void stillRingsAnOfflineUserAndSendsAPushNotification() {
        CallSession call = calls.create("alice", CallDestination.internalUser("mina"));

        assertThat(call.status()).isEqualTo(CallStatus.RINGING);
        assertThat(call.delivery()).isEqualTo(CallDelivery.APP_PUSH);
        assertThat(pushed).containsExactly("mina");
        // The pending call is visible as soon as the callee opens the app.
        assertThat(calls.findRingingForCallee("mina")).extracting(CallSession::id).containsExactly(call.id());
        assertThat(calls.accept(call.id(), "mina").status()).isEqualTo(CallStatus.ACTIVE);
    }

    @Test
    void dialsAnExternalPhoneAndBecomesActiveWhenThePhoneNetworkAnswers() {
        CallSession ringing = calls.create("alice", CallDestination.externalPhone("+82 2-555-0142"));

        assertThat(ringing.delivery()).isEqualTo(CallDelivery.PHONE_NETWORK);
        assertThat(ringing.status()).isEqualTo(CallStatus.RINGING);
        assertThat(dialed).hasSize(1);
        assertThat(pushed).isEmpty();
        assertThat(events.types()).containsExactly("call.ringing");

        dialed.getFirst().run();

        assertThat(calls.get(ringing.id()).status()).isEqualTo(CallStatus.ACTIVE);
        assertThat(events.types()).containsExactly("call.ringing", "call.active");
    }

    @Test
    void ignoresALateAnswerFromThePhoneNetworkAfterHangup() {
        CallSession ringing = calls.create("alice", CallDestination.externalPhone("+82 2-555-0142"));
        calls.hangup(ringing.id(), "alice");

        dialed.getFirst().run();

        assertThat(calls.get(ringing.id()).status()).isEqualTo(CallStatus.ENDED);
        assertThat(events.types()).containsExactly("call.ringing", "call.ended");
    }

    @Test
    void anExternalCallCannotBeAcceptedByAnAppUser() {
        UUID callId = calls.create("alice", CallDestination.externalPhone("+82 2-555-0142")).id();

        assertThatThrownBy(() -> calls.accept(callId, "bob"))
                .isInstanceOf(CallApplicationService.CallAccessDeniedException.class);
    }

    @Test
    void rejectsMalformedPhoneNumbers() {
        assertThatThrownBy(() -> calls.create("alice", CallDestination.externalPhone("hello")))
                .isInstanceOf(CallApplicationService.InvalidCallOperationException.class)
                .hasMessage("invalid phone number");
        assertThat(dialed).isEmpty();
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
    }
}
