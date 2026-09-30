package com.alstjrzzz.ecallipse.call;

import java.util.List;

@FunctionalInterface
public interface NextActionGenerator {
    /**
     * Suggests the next action after {@code source} was finalized, given the call transcript so far.
     * Returns null when there is nothing to suggest.
     */
    NextAction generate(TranscriptSegment source, List<TranscriptSegment> transcript);
}
