package com.alstjrzzz.ecallipse.stt;

import com.alstjrzzz.ecallipse.call.CallApplicationService;
import com.alstjrzzz.ecallipse.call.CallSession;
import com.alstjrzzz.ecallipse.call.CallStatus;
import com.alstjrzzz.ecallipse.call.TranscriptApplicationService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.BinaryMessage;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.BinaryWebSocketHandler;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Receives one participant's microphone audio for a call and turns it into transcript segments.
 * Each browser sends only its own microphone, so the speaker is the connecting user.
 */
@Component
public class CallAudioWebSocketHandler extends BinaryWebSocketHandler {
    private static final Logger log = LoggerFactory.getLogger(CallAudioWebSocketHandler.class);
    private static final String STREAM_ATTRIBUTE = "sttStream";

    private final CallApplicationService calls;
    private final TranscriptApplicationService transcripts;
    private final SpeechToText speechToText;

    public CallAudioWebSocketHandler(CallApplicationService calls, TranscriptApplicationService transcripts, SpeechToText speechToText) {
        this.calls = calls;
        this.transcripts = transcripts;
        this.speechToText = speechToText;
    }

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        URI uri = session.getUri();
        UUID callId = extractCallId(uri);
        String userId = UriComponentsBuilder.fromUri(uri).build().getQueryParams().getFirst("userId");
        CallSession call = calls.get(callId);
        if (userId == null || !call.hasParticipant(userId) || call.status() != CallStatus.ACTIVE) {
            session.close(CloseStatus.POLICY_VIOLATION.withReason("not an active participant"));
            return;
        }

        // A new connection (e.g. after a refresh) starts its own segments so it never revises another one.
        String segmentPrefix = "stt-" + userId + "-" + session.getId() + "-";
        AtomicInteger utterance = new AtomicInteger();
        SpeechToText.Stream stream = speechToText.open((text, finalResult) -> {
            String segmentId = segmentPrefix + utterance.get();
            if (finalResult) utterance.incrementAndGet();
            try {
                transcripts.recordSpeech(callId, userId, segmentId, text, finalResult);
            } catch (RuntimeException exception) {
                log.debug("dropped STT result for call {}: {}", callId, exception.getMessage());
            }
        });
        session.getAttributes().put(STREAM_ATTRIBUTE, stream);
    }

    @Override
    protected void handleBinaryMessage(WebSocketSession session, BinaryMessage message) {
        if (session.getAttributes().get(STREAM_ATTRIBUTE) instanceof SpeechToText.Stream stream) {
            stream.send(message.getPayload());
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        if (session.getAttributes().remove(STREAM_ATTRIBUTE) instanceof SpeechToText.Stream stream) {
            stream.close();
        }
    }

    private UUID extractCallId(URI uri) {
        String[] parts = uri.getPath().split("/");
        // /ws/calls/{callId}/audio
        return UUID.fromString(parts[parts.length - 2]);
    }
}
