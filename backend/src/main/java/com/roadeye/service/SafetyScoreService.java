package com.roadeye.service;

import com.roadeye.model.AccelerationEvent;
import com.roadeye.model.SafetyScore;
import com.roadeye.model.TiltEvent;
import com.roadeye.model.User;
import com.roadeye.repository.AccelerationEventRepository;
import com.roadeye.repository.SafetyScoreRepository;
import com.roadeye.repository.TiltEventRepository;
import com.roadeye.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class SafetyScoreService {

    private final AccelerationEventRepository accelerationRepo;
    private final TiltEventRepository         tiltRepo;
    private final SafetyScoreRepository       safetyScoreRepo;
    private final UserRepository              userRepository;

    // ── Penalty weights ───────────────────────────────────────────────────
    private static final double TILT_PENALTY_PER_EVENT  = 10.0;
    private static final double TILT_MAX_PENALTY        = 50.0;
    private static final double ACCEL_PENALTY_PER_EVENT = 15.0;
    private static final double ACCEL_MAX_PENALTY       = 40.0;
    private static final double HIGH_ACCEL_THRESHOLD    =  8.0; // m/s²

    /**
     * Calculate and persist safety score for a user (last 30 days).
     */
    public SafetyScore calculateSafetyScore(UUID userId) {

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        LocalDateTime since = LocalDateTime.now().minusDays(30);
        LocalDateTime now   = LocalDateTime.now();

        // ── Tilt penalty ──────────────────────────────────────────────────
        List<TiltEvent> tiltEvents = tiltRepo
                .findByUserIdAndEventTimeBetweenOrderByEventTimeAsc(
                        userId, since, now);

        long triggeredTilts = tiltEvents.stream()
                .filter(t -> Boolean.TRUE.equals(t.getTriggered()))
                .count();

        double tiltPenalty = Math.min(
                triggeredTilts * TILT_PENALTY_PER_EVENT,
                TILT_MAX_PENALTY
        );

        // ── Acceleration penalty ──────────────────────────────────────────
        List<AccelerationEvent> accelEvents = accelerationRepo
                .findByUserIdAndEventTimeBetween(userId, since, now);

        long highAccelCount = accelEvents.stream()
                .filter(a -> a.getAcceleration() != null
                        && a.getAcceleration() > HIGH_ACCEL_THRESHOLD)
                .count();

        double accelPenalty = Math.min(
                highAccelCount * ACCEL_PENALTY_PER_EVENT,
                ACCEL_MAX_PENALTY
        );

        // ── Final score ───────────────────────────────────────────────────
        double score = Math.max(0, Math.min(100,
                100.0 - tiltPenalty - accelPenalty));

        log.info("[Safety] userId={} score={} tiltPenalty={} accelPenalty={}",
                userId, score, tiltPenalty, accelPenalty);

        // ── Persist ───────────────────────────────────────────────────────
        SafetyScore safetyScore = SafetyScore.builder()
                .user(user)
                .safetyScore(score)
                .tiltPenalty(tiltPenalty)
                .accelPenalty(accelPenalty)
                .calculatedAt(LocalDateTime.now())
                .build();

        return safetyScoreRepo.save(safetyScore);
    }

    public String toGrade(double score) {
        if (score >= 90) return "A";
        if (score >= 75) return "B";
        if (score >= 60) return "C";
        if (score >= 40) return "D";
        return "F";
    }
}