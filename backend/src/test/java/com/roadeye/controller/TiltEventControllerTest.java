package com.roadeye.controller;

import static org.hamcrest.Matchers.is;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.roadeye.model.TiltEvent;
import com.roadeye.service.TiltEventService;

import java.util.UUID;
import org.springframework.http.MediaType;

@WebMvcTest(TiltEventController.class)
@AutoConfigureMockMvc(addFilters = false)
class TiltEventControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private TiltEventService tiltEventService;

    @MockBean
    private com.roadeye.security.JwtService jwtService;

    @Autowired
    private ObjectMapper objectMapper;

    private TiltEvent createTiltEvent(UUID id, double tiltAngle, boolean triggered) {
        return TiltEvent.builder()
                .id(id)
                .tiltAngle(tiltAngle)
                .threshold(41.0)
                .triggered(triggered)
                .latitude(6.9271)
                .longitude(79.8612)
                .build();
    }

    @Test
    void shouldReturnSuccessWhenTiltIsTriggered() throws Exception {
        TiltEvent event = createTiltEvent(UUID.randomUUID(), 52.0, true);

        when(tiltEventService.processTiltEvent(any(), any(), any(), any()))
                .thenReturn(event);

        String requestBody = createRequestBody(UUID.randomUUID(), 52.0, 6.9271, 79.8612);

        mockMvc.perform(post("/tilt/event")
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestBody))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.triggered", is(true)))
                .andExpect(jsonPath("$.threshold", is(41.0)))
                .andExpect(jsonPath("$.tiltAngle", is(52.0)));
    }

    @Test
    void shouldReturnSuccessWhenTiltIsBelowThreshold() throws Exception {
        TiltEvent event = createTiltEvent(UUID.randomUUID(), 40.9, false);

        when(tiltEventService.processTiltEvent(any(), any(), any(), any()))
                .thenReturn(event);

        String requestBody = createRequestBody(UUID.randomUUID(), 40.9, null, null);

        mockMvc.perform(post("/tilt/event")
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestBody))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.triggered", is(false)))
                .andExpect(jsonPath("$.threshold", is(41.0)))
                .andExpect(jsonPath("$.tiltAngle", is(40.9)));
    }

    @Test
    void shouldReturnSuccessWhenTiltEqualsThreshold() throws Exception {
        TiltEvent event = createTiltEvent(UUID.randomUUID(), 41.0, true);

        when(tiltEventService.processTiltEvent(any(), any(), any(), any()))
                .thenReturn(event);

        String requestBody = createRequestBody(UUID.randomUUID(), 41.0, 6.9271, 79.8612);

        mockMvc.perform(post("/tilt/event")
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestBody))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.triggered", is(true)))
                .andExpect(jsonPath("$.threshold", is(41.0)))
                .andExpect(jsonPath("$.tiltAngle", is(41.0)));
    }

    @Test
    void shouldReturnBadRequestWhenTiltAngleIsMissing() throws Exception {
        String requestBody = """
        {
        "userId":"%s"
        }
        """.formatted(UUID.randomUUID());

        mockMvc.perform(post("/tilt/event")
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestBody))
                .andExpect(status().isBadRequest());
    }

    @Test
    void shouldReturnBadRequestWhenUserIdIsMissing() throws Exception {
        String requestBody = """
        {
        "tiltAngle":41.0
        }
        """;

        mockMvc.perform(post("/tilt/event")
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestBody))
                .andExpect(status().isBadRequest());
    }

    @Test
    void shouldReturnBadRequestWhenRequestIsInvalidJson() throws Exception {
        String requestBody = "{ userId: 'not-a-uuid', tiltAngle: 40.0 }";

        mockMvc.perform(post("/tilt/event")
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestBody))
                .andExpect(status().isBadRequest());
    }

    private String createRequestBody(UUID userId, Double tiltAngle, Double latitude, Double longitude) throws Exception {
        return objectMapper.writeValueAsString(new TiltEventController.TiltEventRequest(
                userId, tiltAngle, latitude, longitude
        ));
    }
}
