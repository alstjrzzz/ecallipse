package com.alstjrzzz.ecallipse;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class PresetFlowIntegrationTests {
    @Autowired
    private MockMvc mvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void aPresetCreatedByOneUserIsVisibleToAnotherButOnlyTheOwnerCanEditOrDelete() throws Exception {
        assertThat(mvc.perform(get("/api/presets")).andReturn().getResponse().getContentAsString())
                .contains("업무 전화");

        String createResponse = mvc.perform(post("/api/presets")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "ownerId":"alice",
                                  "name":"Alice's theme",
                                  "description":"shared with everyone",
                                  "layout":[{"id":"notes-1","type":"notes","x":0,"y":0,"width":100,"height":100,"zIndex":1}]
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.builtin").value(false))
                .andReturn()
                .getResponse()
                .getContentAsString();
        String presetId = objectMapper.readTree(createResponse).get("id").asText();

        mvc.perform(get("/api/presets"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.id=='" + presetId + "')].name").value("Alice's theme"));

        mvc.perform(put("/api/presets/{id}", presetId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"callerId":"bob","name":"Hijacked","description":"","layout":[]}
                                """))
                .andExpect(status().isForbidden());

        mvc.perform(put("/api/presets/{id}", presetId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"callerId":"alice","name":"Alice's renamed theme","description":"","layout":[]}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Alice's renamed theme"));

        mvc.perform(delete("/api/presets/{id}", presetId).param("callerId", "bob"))
                .andExpect(status().isForbidden());
        mvc.perform(delete("/api/presets/{id}", presetId).param("callerId", "alice"))
                .andExpect(status().isNoContent());
        mvc.perform(get("/api/presets"))
                .andExpect(jsonPath("$[?(@.id=='" + presetId + "')]").isEmpty());
    }

    @Test
    void aBuiltinThemeIsReadOnlyForEveryone() throws Exception {
        JsonNode list = objectMapper.readTree(mvc.perform(get("/api/presets")).andReturn().getResponse().getContentAsString());
        String builtinId = list.get(0).get("id").asText();

        mvc.perform(put("/api/presets/{id}", builtinId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"callerId":"alice","name":"Mine now","description":"","layout":[]}
                                """))
                .andExpect(status().isForbidden());
    }
}
