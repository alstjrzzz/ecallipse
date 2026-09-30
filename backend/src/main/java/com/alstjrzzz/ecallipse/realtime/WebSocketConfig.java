package com.alstjrzzz.ecallipse.realtime;

import com.alstjrzzz.ecallipse.stt.CallAudioWebSocketHandler;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

@Configuration
@EnableWebSocket
public class WebSocketConfig implements WebSocketConfigurer {
    private static final String[] ALLOWED_ORIGINS = {"http://localhost:*", "http://127.0.0.1:*"};

    private final CallWebSocketHandler handler;
    private final CallAudioWebSocketHandler audioHandler;

    public WebSocketConfig(CallWebSocketHandler handler, CallAudioWebSocketHandler audioHandler) {
        this.handler = handler;
        this.audioHandler = audioHandler;
    }

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(handler, "/ws/calls/*", "/ws/users/*")
                .setAllowedOriginPatterns(ALLOWED_ORIGINS);
        registry.addHandler(audioHandler, "/ws/calls/*/audio")
                .setAllowedOriginPatterns(ALLOWED_ORIGINS);
    }
}
