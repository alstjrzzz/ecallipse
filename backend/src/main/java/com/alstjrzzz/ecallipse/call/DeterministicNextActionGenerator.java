package com.alstjrzzz.ecallipse.call;

import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.Instant;

@Component
public class DeterministicNextActionGenerator implements NextActionGenerator {
    private static final int MAX_SOURCE_LENGTH = 120;

    private final Clock clock;

    public DeterministicNextActionGenerator(Clock clock) {
        this.clock = clock;
    }

    @Override
    public NextAction generate(TranscriptSegment segment) {
        String normalized = segment.text().trim().replaceAll("\\s+", " ");
        String source = normalized.length() <= MAX_SOURCE_LENGTH
                ? normalized
                : normalized.substring(0, MAX_SOURCE_LENGTH - 1) + "…";
        return new NextAction(
                segment.callId(),
                segment.segmentId(),
                segment.revision(),
                "확인할 다음 행동: " + source,
                Instant.now(clock)
        );
    }
}
