package com.alstjrzzz.ecallipse.call;

import java.time.Instant;
import java.util.UUID;

public record NextAction(
        UUID callId,
        String sourceSegmentId,
        int sourceRevision,
        String text,
        Instant generatedAt
) {
}
