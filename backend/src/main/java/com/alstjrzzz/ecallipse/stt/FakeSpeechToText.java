package com.alstjrzzz.ecallipse.stt;

import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.util.Locale;

/**
 * Stand-in used when no STT provider key is configured. It only detects when someone is speaking,
 * so the whole audio -> transcript -> Next Action path can run without a paid provider.
 */
public class FakeSpeechToText implements SpeechToText {
    static final int SAMPLE_RATE = 16_000;
    private static final double SPEECH_RMS = 500;
    private static final int END_SILENCE_SAMPLES = SAMPLE_RATE * 8 / 10;
    private static final int MIN_SPEECH_SAMPLES = SAMPLE_RATE * 3 / 10;
    private static final int PARTIAL_EVERY_SAMPLES = SAMPLE_RATE;

    @Override
    public Stream open(Listener listener) {
        return new FakeStream(listener);
    }

    private static final class FakeStream implements Stream {
        private final Listener listener;
        private long speechSamples;
        private long silenceSamples;
        private long samplesSincePartial;

        private FakeStream(Listener listener) {
            this.listener = listener;
        }

        @Override
        public synchronized void send(ByteBuffer pcm) {
            ByteBuffer samples = pcm.slice().order(ByteOrder.LITTLE_ENDIAN);
            int count = samples.remaining() / 2;
            if (count == 0) return;
            double sumOfSquares = 0;
            for (int i = 0; i < count; i++) {
                double sample = samples.getShort();
                sumOfSquares += sample * sample;
            }
            boolean speaking = Math.sqrt(sumOfSquares / count) >= SPEECH_RMS;

            if (speaking) {
                speechSamples += count;
                silenceSamples = 0;
                samplesSincePartial += count;
                if (samplesSincePartial >= PARTIAL_EVERY_SAMPLES && speechSamples >= MIN_SPEECH_SAMPLES) {
                    samplesSincePartial = 0;
                    listener.onTranscript("[fake STT] 말하는 중 " + seconds(speechSamples), false);
                }
                return;
            }
            if (speechSamples == 0) return;
            silenceSamples += count;
            if (silenceSamples < END_SILENCE_SAMPLES) return;
            if (speechSamples >= MIN_SPEECH_SAMPLES) {
                listener.onTranscript("[fake STT] " + seconds(speechSamples) + " 발화", true);
            }
            speechSamples = 0;
            silenceSamples = 0;
            samplesSincePartial = 0;
        }

        @Override
        public void close() {
        }

        private static String seconds(long samples) {
            return String.format(Locale.ROOT, "%.1f초", samples / (double) SAMPLE_RATE);
        }
    }
}
