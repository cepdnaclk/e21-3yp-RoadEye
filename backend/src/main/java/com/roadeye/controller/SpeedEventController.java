package com.roadeye.controller;

import com.roadeye.model.SpeedEvent;
import com.roadeye.service.SpeedEventService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/speed")
@RequiredArgsConstructor
@Slf4j
public class SpeedEventController {

    private final SpeedEventService speedService;

    /**
     * POST /api/speed/event
     * Called every 5s from DashboardPage.
     * Returns the saved speed so the app can display confirmed value.
     */
    @PostMapping("/event")
    public ResponseEntity<?> saveSpeed(@RequestBody SpeedRequest req) {
        if (req.getUserId() == null || req.getSpeed() == null) {
            return ResponseEntity.badRequest().body("Missing userId or speed");
        }

        try {
            SpeedEvent saved = speedService.saveSpeed(
                    req.getUserId(),
                    req.getSpeed(),
                    req.getLatitude(),
                    req.getLongitude()
            );

            // Return speed back to frontend for live display
            return ResponseEntity.ok(Map.of(
                    "id",        saved.getId(),
                    "speed",     saved.getSpeed(),
                    "eventTime", saved.getEventTime().toString()
            ));

        } catch (RuntimeException e) {
            log.error("[Speed] Error saving: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * GET /api/speed/latest/{userId}
     * Returns the most recent confirmed speed for live dashboard display.
     */
    @GetMapping("/latest/{userId}")
    public ResponseEntity<?> getLatestSpeed(@PathVariable UUID userId) {
        return speedService.getLatestSpeed(userId)
                .map(e -> ResponseEntity.ok(Map.of(
                        "speed",     e.getSpeed(),
                        "eventTime", e.getEventTime().toString()
                )))
                .orElse(ResponseEntity.ok(Map.of("speed", 0.0)));
    }

    /**
     * GET /api/speed/today/{userId}
     * Returns all speed readings for today — for the speed chart.
     */
    @GetMapping("/today/{userId}")
    public ResponseEntity<List<SpeedEvent>> getToday(@PathVariable UUID userId) {
        return ResponseEntity.ok(speedService.getTodaySpeeds(userId));
    }

    @Data
    public static class SpeedRequest {
        private UUID   userId;
        private Double speed;
        private Double latitude;
        private Double longitude;
    }
}



//         speedService.saveSpeed(
//                 req.getUserId(),
//                 req.getSpeed(),
//                 req.getLatitude(),
//                 req.getLongitude()
//         );

//         return ResponseEntity.ok(Map.of("message", "Speed saved"));
//     }

//     // 🔹 Frontend → get today's chart data
//     @GetMapping("/today/{userId}")
//     public ResponseEntity<List<SpeedEvent>> getToday(@PathVariable UUID userId) {
//         return ResponseEntity.ok(speedService.getTodaySpeeds(userId));
//     }

//     @Data
//     public static class SpeedRequest {
//         private UUID userId;
//         private Double speed;
//         private Double latitude;
//         private Double longitude;
//     }
// }
