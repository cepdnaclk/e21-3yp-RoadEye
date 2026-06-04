package com.roadeye.service;

import com.roadeye.config.AccelerationConfig;
import com.roadeye.model.AccelerationEvent;
import com.roadeye.model.CrashEvent;
import com.roadeye.model.User;
import com.roadeye.repository.AccelerationEventRepository;
import com.roadeye.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class AccelerationEventService {

    private final AccelerationEventRepository accelerationRepo;
    private final UserRepository              userRepository;
    private final CrashEventService           crashEventService;
    private final EmergencyAlertService       emergencyAlertService;
    private final AccelerationConfig          accelerationConfig;   // ← injected from yml

    public AccelerationEvent saveAccelerationEvent(
            UUID userId, Double acceleration, Double tiltAngle,
            Double latitude, Double longitude) {

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        AccelerationEvent event = AccelerationEvent.builder()
                .user(user)
                .acceleration(acceleration)
                .tiltAngle(tiltAngle)
                .latitude(latitude)
                .longitude(longitude)
                .eventTime(LocalDateTime.now())
                .build();

        AccelerationEvent saved = accelerationRepo.save(event);

        detectAccident(user, acceleration, tiltAngle, latitude, longitude);

        return saved;
    }

    private void detectAccident(User user, Double acceleration, Double tiltAngle,
                                 Double latitude, Double longitude) {

        double accelThreshold = accelerationConfig.getThreshold();   // from yml: 15.0
        double tiltThreshold  = 21.0;                                // reuse existing yml value

        boolean highAccel = acceleration != null && acceleration > accelThreshold;
        boolean highTilt  = tiltAngle    != null && Math.abs(tiltAngle) > tiltThreshold;

        if (highAccel && highTilt) {
            log.warn("[Accident] Detected userId={} accel={} m/s² tilt={}°",
                    user.getId(), acceleration, tiltAngle);

            CrashEvent crash = crashEventService.createAccidentEvent(
                    user.getId(), acceleration, tiltAngle, latitude, longitude);

            emergencyAlertService.sendAccidentAlert(crash, user);
        }
    }

    public Optional<AccelerationEvent> getLatestAcceleration(UUID userId) {
        return accelerationRepo.findTopByUserIdOrderByEventTimeDesc(userId);
    }
}