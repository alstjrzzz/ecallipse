package com.alstjrzzz.ecallipse;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.net.http.WebSocket;
import java.time.Duration;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionStage;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class RealtimeCallFlowIntegrationTests {
    @LocalServerPort
    private int port;

    @Autowired
    private ObjectMapper objectMapper;

    private final HttpClient client = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(5))
            .build();

    @Test
    void deliversIncomingCallAndCallEventsOverWebSocket() throws Exception {
        EventListener inboxEvents = new EventListener();
        WebSocket inbox = connect("/ws/users/bob", inboxEvents);

        JsonNode call = post("/api/calls", """
                {"callerId":"alice","destination":{"type":"INTERNAL_USER","address":"bob"}}
                """);
        String callId = call.get("id").asText();
        assertThat(call.get("delivery").asText()).isEqualTo("APP_REALTIME");
        JsonNode incoming = awaitType(inboxEvents, "call.incoming");
        assertThat(incoming.at("/payload/id").asText()).isEqualTo(callId);

        EventListener callEvents = new EventListener();
        WebSocket callSocket = connect("/ws/calls/" + callId, callEvents);

        post("/api/calls/" + callId + "/accept", """
                {"userId":"bob"}
                """);
        assertThat(awaitType(callEvents, "call.active").at("/payload/status").asText())
                .isEqualTo("ACTIVE");

        post("/api/poc/calls/" + callId + "/transcript", """
                {
                  "segmentId":"segment-1",
                  "sequence":0,
                  "revision":0,
                  "speakerId":"alice",
                  "text":"내일까지 견적서를 회신하기",
                  "finalSegment":true
                }
                """);
        assertThat(awaitType(callEvents, "transcript.updated").at("/payload/segmentId").asText())
                .isEqualTo("segment-1");
        assertThat(awaitType(callEvents, "assistance.next-action").at("/payload/sourceSegmentId").asText())
                .isEqualTo("segment-1");

        post("/api/calls/" + callId + "/hangup", """
                {"userId":"alice"}
                """);
        assertThat(awaitType(callEvents, "call.ended").at("/payload/status").asText())
                .isEqualTo("ENDED");

        callSocket.sendClose(WebSocket.NORMAL_CLOSURE, "test complete").join();
        inbox.sendClose(WebSocket.NORMAL_CLOSURE, "test complete").join();
    }

    private WebSocket connect(String path, WebSocket.Listener listener) {
        return client.newWebSocketBuilder()
                .connectTimeout(Duration.ofSeconds(5))
                .buildAsync(URI.create("ws://127.0.0.1:" + port + path), listener)
                .join();
    }

    private JsonNode post(String path, String body) throws Exception {
        HttpRequest request = HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + path))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(body))
                .build();
        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
        assertThat(response.statusCode()).isBetween(200, 299);
        return objectMapper.readTree(response.body());
    }

    private JsonNode awaitType(EventListener listener, String expectedType) throws Exception {
        long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(5);
        while (System.nanoTime() < deadline) {
            String message = listener.messages.poll(250, TimeUnit.MILLISECONDS);
            if (message == null) {
                continue;
            }
            JsonNode event = objectMapper.readTree(message);
            if (expectedType.equals(event.get("type").asText())) {
                return event;
            }
        }
        throw new AssertionError("realtime event was not received: " + expectedType);
    }

    private static final class EventListener implements WebSocket.Listener {
        private final BlockingQueue<String> messages = new LinkedBlockingQueue<>();
        private final StringBuilder partialMessage = new StringBuilder();

        @Override
        public void onOpen(WebSocket webSocket) {
            webSocket.request(1);
        }

        @Override
        public CompletionStage<?> onText(WebSocket webSocket, CharSequence data, boolean last) {
            partialMessage.append(data);
            if (last) {
                messages.add(partialMessage.toString());
                partialMessage.setLength(0);
            }
            webSocket.request(1);
            return CompletableFuture.completedFuture(null);
        }
    }
}
