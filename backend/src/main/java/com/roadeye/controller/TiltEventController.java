package com.roadeye.controller;

import com.roadeye.model.TiltEvent;
import com.roadeye.service.TiltEventService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * TiltEventController
 *
 * POST /api/tilt/event      — sensor sends tilt readings here
 * GET  /api/tilt/history/{userId}           — all tilt events
 * GET  /api/tilt/history/{userId}/triggered — emergency events only
 * GET  /api/tilt/threshold                  — current threshold value
 */
@RestController
@RequestMapping("/api/tilt")
@RequiredArgsConstructor
@Slf4j
public class TiltEventController {

    private final TiltEventService tiltEventService;

    /**
     * POST /api/tilt/event
     * Called by the bike sensor when a tilt reading is ready.
     *
     * Request body:
     * {
     *   "userId":    "uuid",
     *   "tiltAngle": 52.3,
     *   "latitude":  6.9271,   <- optional
     *   "longitude": 79.8612   <- optional
     * }
     */
    @PostMapping("/event")
    public ResponseEntity<?> receiveTiltEvent(@RequestBody TiltEventRequest request) {
        try {
            log.info("[API] Tilt event received: userId={} angle={}°",
                    request.getUserId(), request.getTiltAngle());

            TiltEvent event = tiltEventService.processTiltEvent(
                    request.getUserId(),
                    request.getTiltAngle(),
                    request.getLatitude(),
                    request.getLongitude()
            );

            return ResponseEntity.ok(Map.of(
                    "eventId",   event.getId(),
                    "triggered", event.getTriggered(),
                    "threshold", event.getThreshold(),
                    "tiltAngle", event.getTiltAngle(),
                    "message",   event.getTriggered()
                                 ? "Tilt recorded — mobile device will handle SMS"
                                 : "Tilt recorded — below threshold"
            ));

        } catch (RuntimeException e) {
            log.error("[API] Tilt event error: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * GET /api/tilt/history/{userId}
     * All tilt events for a user — used for the alert history panel.
     */
    @GetMapping("/history/{userId}")
    public ResponseEntity<List<TiltEvent>> getTiltHistory(@PathVariable UUID userId) {
        return ResponseEntity.ok(tiltEventService.getUserTiltHistory(userId));
    }

    /**
     * GET /api/tilt/history/{userId}/triggered
     * Only triggered events — used for the alert count badge on frontend.
     */
    @GetMapping("/history/{userId}/triggered")
    public ResponseEntity<List<TiltEvent>> getTriggeredEvents(@PathVariable UUID userId) {
        return ResponseEntity.ok(tiltEventService.getUserTriggeredEvents(userId));
    }

    /**
     * GET /api/tilt/threshold
     * Returns current threshold so the frontend can display it.
     */
    @GetMapping("/threshold")
    public ResponseEntity<Map<String, Object>> getThreshold() {
        return ResponseEntity.ok(Map.of(
                "threshold", 41.0,
                "unit",      "degrees"
        ));
    }

    // ── Request DTO ──────────────────────────────────────────────────────────
    @lombok.Data
    @lombok.NoArgsConstructor
    @lombok.AllArgsConstructor
    public static class TiltEventRequest {
        private UUID   userId;
        private Double tiltAngle;
        private Double latitude;    // nullable
        private Double longitude;   // nullable
    }
}