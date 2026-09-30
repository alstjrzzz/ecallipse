package com.alstjrzzz.ecallipse.call;

import java.time.Instant;
import java.util.UUID;

public record CallSession(
        UUID id,
        String callerId,
        CallDestination destination,
        CallDelivery delivery,
        CallStatus status,
        Instant createdAt,
        Instant acceptedAt,
        Instant endedAt
) {
    public boolean hasParticipant(String userId) {
        return callerId.equals(userId) || destination.isInternalUser(userId);
    }

    public CallSession accept(Instant now) {
        return new CallSession(id, callerId, destination, delivery, CallStatus.ACTIVE, createdAt, now, null);
    }

    public CallSession end(Instant now) {
        return new CallSession(id, callerId, destination, delivery, CallStatus.ENDED, createdAt, acceptedAt, now);
    }
}
