package com.alstjrzzz.ecallipse.stt;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import tools.jackson.databind.ObjectMapper;

@Configuration
public class SpeechToTextConfig {
    private static final Logger log = LoggerFactory.getLogger(SpeechToTextConfig.class);

    @Bean
    SpeechToText speechToText(
            @Value("${ecallipse.stt.deepgram.api-key:}") String deepgramApiKey,
            @Value("${ecallipse.stt.deepgram.model:nova-2}") String model,
            @Value("${ecallipse.stt.language:ko}") String language,
            ObjectMapper objectMapper
    ) {
        if (deepgramApiKey.isBlank()) {
            log.info("STT provider: fake (set DEEPGRAM_API_KEY to use Deepgram)");
            return new FakeSpeechToText();
        }
        log.info("STT provider: Deepgram {} ({})", model, language);
        return new DeepgramSpeechToText(deepgramApiKey, model, language, objectMapper);
    }
}
