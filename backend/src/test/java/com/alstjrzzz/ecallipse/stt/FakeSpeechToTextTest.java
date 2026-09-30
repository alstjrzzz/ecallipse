package com.alstjrzzz.ecallipse.stt;

import org.junit.jupiter.api.Test;

import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class FakeSpeechToTextTest {
    private final List<String> finals = new ArrayList<>();
    private final SpeechToText.Stream stream = new FakeSpeechToText().open((text, finalResult) -> {
        if (finalResult) finals.add(text);
    });

    @Test
    void emitsOneFinalResultPerUtteranceEndedBySilence() {
        send(10, 5_000);  // 1.0s speech
        send(10, 0);      // 1.0s silence ends it
        send(1, 5_000);   // 0.1s blip is too short
        send(10, 0);

        assertThat(finals).containsExactly("[fake STT] 1.0초 발화");
    }

    private void send(int chunksOf100ms, int amplitude) {
        for (int chunk = 0; chunk < chunksOf100ms; chunk++) {
            ByteBuffer pcm = ByteBuffer.allocate(3_200).order(ByteOrder.LITTLE_ENDIAN);
            for (int i = 0; i < 1_600; i++) pcm.putShort((short) (i % 2 == 0 ? amplitude : -amplitude));
            stream.send(pcm.flip());
        }
    }
}
