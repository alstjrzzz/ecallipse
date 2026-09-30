package com.alstjrzzz.ecallipse.call;

@FunctionalInterface
public interface NextActionGenerator {
    NextAction generate(TranscriptSegment segment);
}
