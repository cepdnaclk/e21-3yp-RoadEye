package com.roadeye.service;

import com.roadeye.config.TiltConfig;
import com.roadeye.model.TiltEvent;
import com.roadeye.model.User;
import com.roadeye.repository.TiltEventRepository;
import com.roadeye.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class TiltEventService {

    private final TiltEventRepository tiltEventRepository;
    private final UserRepository      userRepository;
    private final TiltConfig          tiltConfig;
    private final ExpoPushService     expoPushService;

    public TiltEvent processTiltEvent(UUID userId,
                                      Double tiltAngle,
                                      Double latitude,
                                      Double longitude) {

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found: " + userId));

        double  threshold = tiltConfig.getThreshold();
        boolean triggered = tiltAngle >= threshold;

        log.info("[Tilt] user={} angle={}° threshold={}° triggered={}",
                userId, tiltAngle, threshold, triggered);

        TiltEvent event = TiltEvent.builder()
                .user(user)
                .tiltAngle(tiltAngle)
                .threshold(threshold)
                .triggered(triggered)
                .latitude(latitude)
                .longitude(longitude)
                .build();

        TiltEvent saved = tiltEventRepository.save(event);

        // Send push notification if triggered and not in cooldown
        if (triggered && !isInCooldown(userId)) {
            sendTiltNotification(user, saved);
        }

        return saved;
    }

    /**
     * Sends a push notification to the rider's phone.
     * This notifies the RIDER themselves that a tilt was detected.
     * The rider's app can then automatically trigger SMS to emergency contacts.
     */
    private void sendTiltNotification(User user, TiltEvent event) {
        String token = user.getExpoPushToken();

        if (token == null || token.isBlank()) {
            log.warn("[Push] User {} has no Expo push token saved", user.getId());
            return;
        }

        String title = "🚨 Tilt Alert Detected";
        String body  = String.format(
                "Tilt of %.1f° detected (threshold: %.1f°). Are you okay?",
                event.getTiltAngle(),
                event.getThreshold()
        );

        // Pass location as JSON data so the app can use it
        String data = null;
        if (event.getLatitude() != null && event.getLongitude() != null) {
            data = String.format(
                    "{\"latitude\": %f, \"longitude\": %f, \"triggered\": true}",
                    event.getLatitude(),
                    event.getLongitude()
            );
        }

        expoPushService.sendPushNotification(token, title, body, data);
    }

    private boolean isInCooldown(UUID userId) {
        LocalDateTime cooldownStart =
                LocalDateTime.now().minusSeconds(tiltConfig.getCooldownSeconds());

        return tiltEventRepository
                .findByUserIdAndTriggeredOrderByEventTimeDesc(userId, true)
                .stream()
                .anyMatch(e -> e.getEventTime().isAfter(cooldownStart));
    }

    public List<TiltEvent> getUserTiltHistory(UUID userId) {
        return tiltEventRepository.findByUserIdOrderByEventTimeDesc(userId);
    }

    public List<TiltEvent> getUserTriggeredEvents(UUID userId) {
        return tiltEventRepository.findByUserIdAndTriggeredOrderByEventTimeDesc(userId, true);
    }
}