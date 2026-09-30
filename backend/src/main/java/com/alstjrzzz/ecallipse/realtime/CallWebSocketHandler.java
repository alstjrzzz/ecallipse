package com.alstjrzzz.ecallipse.realtime;

import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.io.IOException;
import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Instant;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import java.util.concurrent.atomic.AtomicLong;

import tools.jackson.core.JacksonException;
import tools.jackson.databind.ObjectMapper;

@Component
public class CallWebSocketHandler extends TextWebSocketHandler implements CallEventPublisher, UserEventPublisher, UserPresence {
    private static final String CHANNEL_ATTRIBUTE = "realtimeChannel";

    private final ConcurrentMap<String, Set<WebSocketSession>> sessionsByChannel = new ConcurrentHashMap<>();
    private final ConcurrentMap<String, AtomicLong> eventSequences = new ConcurrentHashMap<>();
    private final ObjectMapper objectMapper;
    private final Clock clock;

    public CallWebSocketHandler(ObjectMapper objectMapper, Clock clock) {
        this.objectMapper = objectMapper;
        this.clock = clock;
    }

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        String channel = extractChannel(session.getUri());
        session.getAttributes().put(CHANNEL_ATTRIBUTE, channel);
        sessionsByChannel.computeIfAbsent(channel, ignored -> ConcurrentHashMap.newKeySet()).add(session);
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        removeSession(session);
    }

    @Override
    public void handleTransportError(WebSocketSession session, Throwable exception) throws Exception {
        removeSession(session);
        if (session.isOpen()) {
            session.close(CloseStatus.SERVER_ERROR);
        }
    }

    @Override
    public boolean isOnline(String userId) {
        Set<WebSocketSession> sessions = sessionsByChannel.get(userChannel(userId));
        return sessions != null && sessions.stream().anyMatch(WebSocketSession::isOpen);
    }

    @Override
    public void publish(UUID callId, String type, Object payload) {
        publishToChannel(callChannel(callId), callId, type, payload);
    }

    @Override
    public void publishToUser(String userId, UUID callId, String type, Object payload) {
        publishToChannel(userChannel(userId), callId, type, payload);
    }

    private void publishToChannel(String channel, UUID callId, String type, Object payload) {
        long sequence = eventSequences.computeIfAbsent(channel, ignored -> new AtomicLong()).incrementAndGet();
        CallRealtimeEvent event = new CallRealtimeEvent(callId, sequence, type, Instant.now(clock), payload);
        TextMessage message = new TextMessage(toJson(event));

        Set<WebSocketSession> sessions = sessionsByChannel.getOrDefault(channel, Set.of());
        for (WebSocketSession session : sessions) {
            send(session, message);
        }
    }

    private void send(WebSocketSession session, TextMessage message) {
        if (!session.isOpen()) {
            removeSession(session);
            return;
        }
        try {
            synchronized (session) {
                session.sendMessage(message);
            }
        } catch (IOException exception) {
            removeSession(session);
            try {
                session.close(CloseStatus.SERVER_ERROR);
            } catch (IOException ignored) {
                // The broken transport is already being discarded.
            }
        }
    }

    private String toJson(CallRealtimeEvent event) {
        try {
            return objectMapper.writeValueAsString(event);
        } catch (JacksonException exception) {
            throw new IllegalStateException("failed to serialize realtime call event", exception);
        }
    }

    private String extractChannel(URI uri) {
        if (uri == null || uri.getPath() == null) {
            throw new IllegalArgumentException("realtime WebSocket URI is missing");
        }
        String path = uri.getPath();
        String value = path.substring(path.lastIndexOf('/') + 1);
        if (path.startsWith("/ws/calls/")) {
            return callChannel(UUID.fromString(value));
        }
        if (path.startsWith("/ws/users/")) {
            return userChannel(URLDecoder.decode(value, StandardCharsets.UTF_8));
        }
        throw new IllegalArgumentException("unsupported realtime WebSocket URI");
    }

    private String callChannel(UUID callId) {
        return "call:" + callId;
    }

    private String userChannel(String userId) {
        return "user:" + userId;
    }

    private void removeSession(WebSocketSession session) {
        Object value = session.getAttributes().get(CHANNEL_ATTRIBUTE);
        if (!(value instanceof String channel)) {
            return;
        }
        Set<WebSocketSession> sessions = sessionsByChannel.get(channel);
        if (sessions == null) {
            return;
        }
        sessions.remove(session);
        if (sessions.isEmpty()) {
            sessionsByChannel.remove(channel, sessions);
        }
    }
}
