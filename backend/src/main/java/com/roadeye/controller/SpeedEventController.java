package com.roadeye.controller;

import com.roadeye.model.SpeedEvent;
import com.roadeye.service.SpeedEventService;

import lombok.Data;
import lombok.RequiredArgsConstructor;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/speed")
@RequiredArgsConstructor
public class SpeedEventController {

    private final SpeedEventService speedService;

    // 🔹 Sensor → Mobile → Backend
    @PostMapping("/event")
    public ResponseEntity<?> saveSpeed(@RequestBody SpeedRequest req) {

        if (req.getUserId() == null || req.getSpeed() == null) {
        return ResponseEntity.badRequest().body("Missing data");
    }

        speedService.saveSpeed(
                req.getUserId(),
                req.getSpeed(),
                req.getLatitude(),
                req.getLongitude()
        );

        return ResponseEntity.ok(Map.of("message", "Speed saved"));
    }

    // 🔹 Frontend → get today's chart data
    @GetMapping("/today/{userId}")
    public ResponseEntity<List<SpeedEvent>> getToday(@PathVariable UUID userId) {
        return ResponseEntity.ok(speedService.getTodaySpeeds(userId));
    }

    @Data
    public static class SpeedRequest {
        private UUID userId;
        private Double speed;
        private Double latitude;
        private Double longitude;
    }
}
