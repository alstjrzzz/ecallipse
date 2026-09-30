package com.alstjrzzz.ecallipse.call;

import com.google.genai.Client;
import com.google.genai.types.Content;
import com.google.genai.types.GenerateContentConfig;
import com.google.genai.types.Part;
import com.google.genai.types.ThinkingConfig;
import com.google.genai.types.ThinkingLevel;

import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.stream.Collectors;

/** Asks Gemini for one short, actionable next step based on the recent transcript. */
public class GeminiNextActionGenerator implements NextActionGenerator {
    private static final int MAX_SEGMENTS = 40;
    private static final String SYSTEM_PROMPT = """
            너는 실시간 전화 통화를 옆에서 돕는 보조자다. 통화 transcript를 보고, 통화 참가자가 지금 이어서 하면 좋을 행동 하나를 제안한다.
            - 한국어 한 문장, 40자 이내로 쓴다.
            - 확인할 질문, 합의할 사항, 기록할 할 일처럼 바로 실행할 수 있는 행동으로 쓴다.
            - 설명, 머리말, 따옴표 없이 제안 문장만 출력한다.
            - 아직 제안할 만한 내용이 없으면 "대화를 계속 들어 보세요."라고 쓴다.
            """;

    private final Client client;
    private final String model;
    private final GenerateContentConfig config;
    private final Clock clock;

    public GeminiNextActionGenerator(Client client, String model, Clock clock) {
        this.client = client;
        this.model = model;
        this.clock = clock;
        this.config = GenerateContentConfig.builder()
                .systemInstruction(Content.fromParts(Part.fromText(SYSTEM_PROMPT)))
                // Thinking tokens count toward this limit, so leave room beyond the one-line answer.
                .maxOutputTokens(2048)
                // Latency matters more than depth for a live hint. Thinking cannot be turned off on 3.x Flash.
                .thinkingConfig(ThinkingConfig.builder().thinkingLevel(ThinkingLevel.Known.LOW))
                .build();
    }

    @Override
    public NextAction generate(TranscriptSegment source, List<TranscriptSegment> transcript) {
        List<TranscriptSegment> finals = transcript.stream().filter(TranscriptSegment::finalSegment).toList();
        String lines = finals.subList(Math.max(0, finals.size() - MAX_SEGMENTS), finals.size()).stream()
                .map(segment -> "[" + segment.speakerId() + "] " + segment.text())
                .collect(Collectors.joining("\n"));

        String text = client.models.generateContent(model, "통화 transcript:\n" + lines, config).text();
        if (text == null || text.isBlank()) {
            return null;
        }
        return new NextAction(source.callId(), source.segmentId(), source.revision(), text.strip(), Instant.now(clock));
    }
}
