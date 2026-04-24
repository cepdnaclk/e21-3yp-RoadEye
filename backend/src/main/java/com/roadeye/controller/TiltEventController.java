package com.roadeye.controller;

import com.roadeye.model.TiltEvent;
import com.roadeye.service.TiltEventService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import lombok.RequiredArgsConstructor;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * TiltEventController
 *
 * Endpoints consumed by:
 * - The bike sensor / IoT device (POST /api/tilt/event)
 * - The mobile frontend (GET history endpoints)
 *
 * Authentication: protected by JWT via JwtAuthFilter (same as all /api/* routes).
 */
@RestController
@RequestMapping("/api/tilt")
@RequiredArgsConstructor
@Slf4j
public class TiltEventController {

    private final TiltEventService tiltEventService;

    /**
     * POST /api/tilt/event
     *
     * Called by the bike sensor when a tilt reading is ready.
     * Body example:
     * {
     *   "userId": "uuid-here",
     *   "tiltAngle": 52.3,
     *   "latitude": 6.9271,
     *   "longitude": 79.8612,
     *   "customMessage": "optional user message override"
     * }
     *
     * If tiltAngle >= threshold (45°), emergency alerts fire automatically.
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
                    request.getLongitude(),
                    request.getCustomMessage()
            );

            return ResponseEntity.ok(Map.of(
                    "eventId",   event.getId(),
                    "triggered", event.getTriggered(),
                    "threshold", event.getThreshold(),
                    "tiltAngle", event.getTiltAngle(),
                    "message",   event.getTriggered()
                                 ? "Emergency alerts dispatched"
                                 : "Event recorded, no alert needed"
            ));

        } catch (RuntimeException e) {
            log.error("[API] Tilt event error: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * GET /api/tilt/history/{userId}
     * Returns all tilt events for the user — for the alert history panel on the frontend.
     */
    @GetMapping("/history/{userId}")
    public ResponseEntity<List<TiltEvent>> getTiltHistory(@PathVariable UUID userId) {
        return ResponseEntity.ok(tiltEventService.getUserTiltHistory(userId));
    }

    /**
     * GET /api/tilt/history/{userId}/triggered
     * Returns only triggered (emergency) events — used for the alert count badge.
     */
    @GetMapping("/history/{userId}/triggered")
    public ResponseEntity<List<TiltEvent>> getTriggeredEvents(@PathVariable UUID userId) {
        return ResponseEntity.ok(tiltEventService.getUserTriggeredEvents(userId));
    }

    /**
     * GET /api/tilt/threshold
     * Exposes the current threshold to the frontend so it can display it.
     */
    @GetMapping("/threshold")
    public ResponseEntity<Map<String, Object>> getThreshold() {
        return ResponseEntity.ok(Map.of(
                "threshold", 45.0,
                "unit", "degrees",
                "note", "Hardcoded — will be sensor-calibrated later"
        ));
    }

    // ── Request DTO ──────────────────────────────────────────────────────────
    @lombok.Data
    @lombok.NoArgsConstructor
    @lombok.AllArgsConstructor
    public static class TiltEventRequest {
        private UUID userId;
        private Double tiltAngle;
        private Double latitude;      // nullable
        private Double longitude;     // nullable
        private String customMessage; // nullable — uses default if absent
    }
}