package com.alstjrzzz.ecallipse.realtime;

import java.time.Instant;
import java.util.UUID;

public record CallRealtimeEvent(
        UUID callId,
        long eventSequence,
        String type,
        Instant occurredAt,
        Object payload
) {
}
