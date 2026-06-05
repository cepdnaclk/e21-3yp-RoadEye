package com.roadeye.controller;

import com.roadeye.model.SafetyScore;
import com.roadeye.service.SafetyScoreService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/safety-score")
@RequiredArgsConstructor
@Slf4j
public class SafetyScoreController {

    private final SafetyScoreService safetyScoreService;

    /**
     * GET /safety-score/{userId}
     * Calculates and returns the user's current safety score.
     */
    @GetMapping("/{userId}")
    public ResponseEntity<?> getSafetyScore(@PathVariable UUID userId) {
        try {
            SafetyScore result = safetyScoreService.calculateSafetyScore(userId);

            return ResponseEntity.ok(Map.of(
                    "safetyScore",  result.getSafetyScore(),
                    "tiltPenalty",  result.getTiltPenalty(),
                    "accelPenalty", result.getAccelPenalty(),
                    "grade",        safetyScoreService.toGrade(result.getSafetyScore()),
                    "calculatedAt", result.getCalculatedAt().toString()
            ));
        } catch (RuntimeException e) {
            log.error("[SafetyScore] Error: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
