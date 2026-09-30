package com.alstjrzzz.ecallipse;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = "ecallipse.dummy-phone-network.answer-delay=PT0.05S")
@AutoConfigureMockMvc
class CallFlowIntegrationTests {
    @Autowired
    private MockMvc mvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void runsTheLocalWalkingSkeletonFromRingingToNextActionAndHangup() throws Exception {
        String createResponse = mvc.perform(post("/api/calls")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"callerId":"alice","destination":{"type":"INTERNAL_USER","address":"bob"}}
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("RINGING"))
                // No application WebSocket is open in this test, so the callee is reached by push.
                .andExpect(jsonPath("$.delivery").value("APP_PUSH"))
                .andReturn()
                .getResponse()
                .getContentAsString();
        JsonNode created = objectMapper.readTree(createResponse);
        String callId = created.get("id").asText();

        mvc.perform(get("/api/users/bob/calls/ringing"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(callId));

        mvc.perform(post("/api/calls/{callId}/accept", callId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"userId":"bob"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ACTIVE"));

        mvc.perform(post("/api/poc/calls/{callId}/transcript", callId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "segmentId":"segment-1",
                                  "sequence":0,
                                  "revision":0,
                                  "speakerId":"alice",
                                  "text":"내일까지 견적서를 회신하기",
                                  "finalSegment":true
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.segment.finalSegment").value(true));

        mvc.perform(get("/api/calls/{callId}/transcript", callId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].segmentId").value("segment-1"));

        mvc.perform(post("/api/calls/{callId}/hangup", callId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"userId":"alice"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ENDED"));
    }

    @Test
    void connectsAnExternalPhoneThroughTheDummyPhoneNetwork() throws Exception {
        String createResponse = mvc.perform(post("/api/calls")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"callerId":"alice","destination":{"type":"EXTERNAL_PHONE","address":"+82 2-555-0142"}}
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.delivery").value("PHONE_NETWORK"))
                .andExpect(jsonPath("$.destination.type").value("EXTERNAL_PHONE"))
                .andReturn()
                .getResponse()
                .getContentAsString();
        String callId = objectMapper.readTree(createResponse).get("id").asText();

        String status = "";
        for (int attempt = 0; attempt < 40 && !"ACTIVE".equals(status); attempt++) {
            Thread.sleep(50);
            status = objectMapper.readTree(mvc.perform(get("/api/calls/{callId}", callId))
                            .andReturn()
                            .getResponse()
                            .getContentAsString())
                    .get("status")
                    .asText();
        }
        org.assertj.core.api.Assertions.assertThat(status).isEqualTo("ACTIVE");
    }

    @Test
    void rejectsACallWithoutADestination() throws Exception {
        mvc.perform(post("/api/calls")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"callerId":"alice"}
                                """))
                .andExpect(status().isBadRequest());
    }

    @Test
    void reportsPresenceFromOpenApplicationConnections() throws Exception {
        mvc.perform(get("/api/presence").param("userIds", "alice,mina"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.alice").value(false))
                .andExpect(jsonPath("$.mina").value(false));
    }
}
