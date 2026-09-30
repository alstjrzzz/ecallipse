package com.alstjrzzz.ecallipse.call;

import java.time.Instant;
import java.util.UUID;

public record TranscriptSegment(
        UUID callId,
        String segmentId,
        long sequence,
        int revision,
        String speakerId,
        String text,
        boolean finalSegment,
        Instant receivedAt
) {
}
