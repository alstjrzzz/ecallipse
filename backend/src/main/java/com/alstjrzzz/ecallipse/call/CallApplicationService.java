package com.alstjrzzz.ecallipse.call;

import com.alstjrzzz.ecallipse.realtime.CallEventPublisher;
import com.alstjrzzz.ecallipse.realtime.UserEventPublisher;
import com.alstjrzzz.ecallipse.realtime.UserPresence;
import org.springframework.stereotype.Service;

import java.time.Clock;
import java.time.Instant;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Supplier;
import java.util.regex.Pattern;

@Service
public class CallApplicationService {
    private static final Pattern PHONE_NUMBER = Pattern.compile("^\\+?[0-9][0-9 \\-]{5,18}[0-9]$");

    private final Map<UUID, CallSession> calls = new HashMap<>();
    private final CallEventPublisher events;
    private final UserEventPublisher userEvents;
    private final UserPresence presence;
    private final PushNotifier pushNotifier;
    private final PhoneNetworkGateway phoneNetwork;
    private final Clock clock;

    public CallApplicationService(
            CallEventPublisher events,
            UserEventPublisher userEvents,
            UserPresence presence,
            PushNotifier pushNotifier,
            PhoneNetworkGateway phoneNetwork,
            Clock clock
    ) {
        this.events = events;
        this.userEvents = userEvents;
        this.presence = presence;
        this.pushNotifier = pushNotifier;
        this.phoneNetwork = phoneNetwork;
        this.clock = clock;
    }

    public synchronized CallSession create(String callerId, CallDestination destination) {
        if (destination.type() == CallDestination.Type.INTERNAL_USER) {
            return createInternal(callerId, destination);
        }
        return createExternal(callerId, destination);
    }

    private CallSession createInternal(String callerId, CallDestination destination) {
        if (callerId.equals(destination.address())) {
            throw new InvalidCallOperationException("callerId and callee must be different");
        }
        // Presence decides only how the callee is reached; an offline callee can still be called.
        boolean online = presence.isOnline(destination.address());
        CallSession call = ring(callerId, destination, online ? CallDelivery.APP_REALTIME : CallDelivery.APP_PUSH);
        userEvents.publishToUser(destination.address(), call.id(), "call.incoming", call);
        if (!online) {
            pushNotifier.notifyIncomingCall(destination.address(), call);
        }
        return call;
    }

    private CallSession createExternal(String callerId, CallDestination destination) {
        if (!PHONE_NUMBER.matcher(destination.address()).matches()) {
            throw new InvalidCallOperationException("invalid phone number");
        }
        CallSession call = ring(callerId, destination, CallDelivery.PHONE_NETWORK);
        phoneNetwork.dial(call, () -> answerFromPhoneNetwork(call.id()));
        return call;
    }

    private CallSession ring(String callerId, CallDestination destination, CallDelivery delivery) {
        CallSession call = new CallSession(
                UUID.randomUUID(),
                callerId,
                destination,
                delivery,
                CallStatus.RINGING,
                Instant.now(clock),
                null,
                null
        );
        calls.put(call.id(), call);
        events.publish(call.id(), "call.ringing", call);
        return call;
    }

    /** Called by the phone network when the external party answers. Late answers on ended calls are ignored. */
    synchronized void answerFromPhoneNetwork(UUID callId) {
        CallSession current = calls.get(callId);
        if (current == null || current.status() != CallStatus.RINGING || current.delivery() != CallDelivery.PHONE_NETWORK) {
            return;
        }
        CallSession updated = current.accept(Instant.now(clock));
        calls.put(callId, updated);
        events.publish(callId, "call.active", updated);
    }

    public synchronized CallSession get(UUID callId) {
        CallSession call = calls.get(callId);
        if (call == null) {
            throw new CallNotFoundException(callId);
        }
        return call;
    }

    public synchronized CallSession accept(UUID callId, String userId) {
        CallSession current = get(callId);
        if (!current.destination().isInternalUser(userId)) {
            throw new CallAccessDeniedException("only the callee can accept this call");
        }
        if (current.status() != CallStatus.RINGING) {
            throw new InvalidCallOperationException("only a ringing call can be accepted");
        }
        CallSession updated = current.accept(Instant.now(clock));
        calls.put(callId, updated);
        events.publish(callId, "call.active", updated);
        return updated;
    }

    public synchronized CallSession hangup(UUID callId, String userId) {
        CallSession current = get(callId);
        if (!current.hasParticipant(userId)) {
            throw new CallAccessDeniedException("only a participant can hang up this call");
        }
        if (current.status() == CallStatus.ENDED) {
            throw new InvalidCallOperationException("call has already ended");
        }
        CallSession updated = current.end(Instant.now(clock));
        calls.put(callId, updated);
        events.publish(callId, "call.ended", updated);
        return updated;
    }

    public synchronized CallSession requireActive(UUID callId) {
        CallSession call = get(callId);
        if (call.status() != CallStatus.ACTIVE) {
            throw new InvalidCallOperationException("transcript is accepted only while a call is active");
        }
        return call;
    }

    public synchronized List<CallSession> findRingingForCallee(String userId) {
        return calls.values().stream()
                .filter(call -> call.destination().isInternalUser(userId))
                .filter(call -> call.status() == CallStatus.RINGING)
                .sorted(Comparator.comparing(CallSession::createdAt))
                .toList();
    }

    public synchronized <T> T whileActive(UUID callId, Supplier<T> work) {
        requireActive(callId);
        return work.get();
    }

    public static class CallNotFoundException extends RuntimeException {
        public CallNotFoundException(UUID callId) {
            super("call not found: " + callId);
        }
    }

    public static class InvalidCallOperationException extends RuntimeException {
        public InvalidCallOperationException(String message) {
            super(message);
        }
    }

    public static class CallAccessDeniedException extends RuntimeException {
        public CallAccessDeniedException(String message) {
            super(message);
        }
    }
}
