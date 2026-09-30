package com.alstjrzzz.ecallipse.stt;

import java.nio.ByteBuffer;

/** Streaming speech-to-text. Audio is 16 kHz, mono, 16-bit little-endian PCM. */
public interface SpeechToText {
    Stream open(Listener listener);

    interface Stream {
        void send(ByteBuffer pcm);

        void close();
    }

    @FunctionalInterface
    interface Listener {
        /** Partial results revise the current utterance until a final result closes it. */
        void onTranscript(String text, boolean finalResult);
    }
}
