package com.roadeye.service;

import com.roadeye.model.AccelerationEvent;
import com.roadeye.model.CrashEvent;
import com.roadeye.model.User;
import com.roadeye.repository.AccelerationEventRepository;
import com.roadeye.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
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
    private final UserRepository userRepository;
    private final CrashEventService crashEventService;
    private final ExpoPushService expoPushService;

    @Value("${roadeye.acceleration.threshold:15.0}")
    private Double accelThreshold;

    @Value("${roadeye.tilt.threshold:21.0}")
    private Double tiltThreshold;

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

        detectAccident(user, saved, acceleration, tiltAngle, latitude, longitude);

        return saved;
    }

    private void detectAccident(User user, AccelerationEvent event,
                                 Double acceleration, Double tiltAngle,
                                 Double latitude, Double longitude) {

        boolean highAccel = acceleration != null && acceleration > accelThreshold;
        boolean highTilt  = tiltAngle    != null && Math.abs(tiltAngle) > tiltThreshold;

        if (highAccel && highTilt) {
            log.warn("[Accident] Detected for userId={} accel={}m/s² tilt={}°",
                    user.getId(), acceleration, tiltAngle);

            // Build a minimal CrashEvent via the existing service
            CrashEvent crashData = new CrashEvent();
            crashData.setLatitude(latitude != null ? latitude : 0.0);
            crashData.setLongitude(longitude != null ? longitude : 0.0);
            crashData.setSeverityScore((acceleration / accelThreshold) * 10.0); // scale to 0-10+
            crashData.setOccurredAt(LocalDateTime.now());

            CrashEvent crash = crashEventService.reportCrashEvent(user.getId(), crashData);

            // Send push notification
            // NOTE: replace with actual token lookup from User entity if stored there
            String pushToken = user.getExpoPushToken(); // see note below
            if (pushToken != null && !pushToken.isBlank()) {
                expoPushService.sendPushNotification(
                        pushToken,
                        "⚠️ Accident Detected",
                        "High acceleration and tilt detected. Are you okay?",
                        "{\"type\":\"accident\",\"crashEventId\":\"" + crash.getId() + "\"}"
                );
            }
        }
    }

    public Optional<AccelerationEvent> getLatestAcceleration(UUID userId) {
        return accelerationRepo.findTopByUserIdOrderByEventTimeDesc(userId);
    }
}
