package com.alstjrzzz.ecallipse.stt;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.WebSocket;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionStage;

/** Deepgram live transcription over its streaming WebSocket API. */
public class DeepgramSpeechToText implements SpeechToText {
    private static final Logger log = LoggerFactory.getLogger(DeepgramSpeechToText.class);

    private final HttpClient http = HttpClient.newHttpClient();
    private final String apiKey;
    private final URI uri;
    private final ObjectMapper objectMapper;

    public DeepgramSpeechToText(String apiKey, String model, String language, ObjectMapper objectMapper) {
        this.apiKey = apiKey;
        this.objectMapper = objectMapper;
        this.uri = URI.create("wss://api.deepgram.com/v1/listen"
                + "?encoding=linear16&sample_rate=" + FakeSpeechToText.SAMPLE_RATE + "&channels=1"
                + "&interim_results=true&smart_format=true"
                + "&model=" + URLEncoder.encode(model, StandardCharsets.UTF_8)
                + "&language=" + URLEncoder.encode(language, StandardCharsets.UTF_8));
    }

    @Override
    public Stream open(Listener listener) {
        return new DeepgramStream(listener);
    }

    private final class DeepgramStream implements Stream, WebSocket.Listener {
        private final Listener listener;
        private final StringBuilder textFrame = new StringBuilder();
        private final CompletableFuture<WebSocket> socket;
        // java.net.http.WebSocket allows only one outstanding send, so sends are chained.
        private CompletableFuture<?> sends;

        private DeepgramStream(Listener listener) {
            this.listener = listener;
            this.socket = http.newWebSocketBuilder()
                    .header("Authorization", "Token " + apiKey)
                    .buildAsync(uri, this);
            this.sends = socket;
            socket.exceptionally(error -> {
                log.warn("Deepgram connection failed: {}", error.getMessage());
                return null;
            });
        }

        @Override
        public synchronized void send(ByteBuffer pcm) {
            ByteBuffer copy = ByteBuffer.allocate(pcm.remaining()).put(pcm.duplicate()).flip();
            sends = sends.thenCompose(ignored -> socket.join().sendBinary(copy, true));
        }

        @Override
        public synchronized void close() {
            sends = sends
                    .thenCompose(ignored -> socket.join().sendText("{\"type\":\"CloseStream\"}", true))
                    .exceptionally(error -> null);
        }

        @Override
        public CompletionStage<?> onText(WebSocket webSocket, CharSequence data, boolean last) {
            textFrame.append(data);
            if (last) {
                handleMessage(textFrame.toString());
                textFrame.setLength(0);
            }
            webSocket.request(1);
            return null;
        }

        @Override
        public void onError(WebSocket webSocket, Throwable error) {
            log.warn("Deepgram stream error: {}", error.getMessage());
        }

        private void handleMessage(String json) {
            JsonNode message = objectMapper.readTree(json);
            if (!"Results".equals(message.path("type").asString())) return;
            String transcript = message.path("channel").path("alternatives").path(0).path("transcript").asString().strip();
            if (transcript.isEmpty()) return;
            listener.onTranscript(transcript, message.path("is_final").asBoolean());
        }
    }
}
