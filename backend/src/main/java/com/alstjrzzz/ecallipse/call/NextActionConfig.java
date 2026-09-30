package com.alstjrzzz.ecallipse.call;

import com.google.genai.Client;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Clock;

@Configuration
public class NextActionConfig {
    private static final Logger log = LoggerFactory.getLogger(NextActionConfig.class);

    @Bean
    NextActionGenerator nextActionGenerator(
            @Value("${ecallipse.next-action.gemini.api-key:}") String apiKey,
            @Value("${ecallipse.next-action.model:gemini-3.8-flash}") String model,
            Clock clock
    ) {
        if (apiKey.isBlank()) {
            log.info("Next Action generator: deterministic (set GEMINI_API_KEY to use Gemini)");
            return new DeterministicNextActionGenerator(clock);
        }
        log.info("Next Action generator: Gemini {}", model);
        return new GeminiNextActionGenerator(Client.builder().apiKey(apiKey).build(), model, clock);
    }
}
