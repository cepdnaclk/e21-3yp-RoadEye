package com.roadeye.controller;

import com.roadeye.model.AccelerationEvent;
import com.roadeye.service.AccelerationEventService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/acceleration")
@RequiredArgsConstructor
@Slf4j
public class AccelerationEventController {

    private final AccelerationEventService accelerationService;

    @PostMapping("/event")
    public ResponseEntity<?> saveAcceleration(@RequestBody AccelRequest req) {
        if (req.getUserId() == null || req.getAcceleration() == null) {
            return ResponseEntity.badRequest().body("Missing userId or acceleration");
        }

        try {
            AccelerationEvent saved = accelerationService.saveAccelerationEvent(
                    req.getUserId(),
                    req.getAcceleration(),
                    req.getTiltAngle(),
                    req.getLatitude(),
                    req.getLongitude()
            );

            return ResponseEntity.ok(Map.of(
                    "id",           saved.getId(),
                    "acceleration", saved.getAcceleration(),
                    "tiltAngle",    saved.getTiltAngle(),
                    "eventTime",    saved.getEventTime().toString(),
                    "accidentDetected", saved.getAcceleration() > 15.0
                            && Math.abs(saved.getTiltAngle()) > 21.0
            ));
        } catch (RuntimeException e) {
            log.error("[Acceleration] Error: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/latest/{userId}")
    public ResponseEntity<?> getLatest(@PathVariable UUID userId) {
        return accelerationService.getLatestAcceleration(userId)
                .map(e -> ResponseEntity.ok(Map.of(
                        "acceleration", e.getAcceleration(),
                        "tiltAngle",    e.getTiltAngle(),
                        "eventTime",    e.getEventTime().toString()
                )))
                .orElse(ResponseEntity.ok(Map.of("acceleration", 0.0)));
    }

    @Data
    public static class AccelRequest {
        private UUID   userId;
        private Double acceleration;
        private Double tiltAngle;
        private Double latitude;
        private Double longitude;
    }
}
