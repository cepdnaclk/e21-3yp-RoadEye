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
    private final UserRepository userRepository;
    private final EmergencyAlertService emergencyAlertService;
    private final TiltConfig tiltConfig;

    public TiltEvent processTiltEvent(UUID userId,
                                     Double tiltAngle,
                                     Double latitude,
                                     Double longitude,
                                     String customMessage) {

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        double threshold = tiltConfig.getThreshold();
        boolean triggered = tiltAngle >= threshold;

        TiltEvent event = TiltEvent.builder()
                .user(user)
                .tiltAngle(tiltAngle)
                .threshold(threshold)
                .triggered(triggered)
                .latitude(latitude)
                .longitude(longitude)
                .build();

        TiltEvent saved = tiltEventRepository.save(event);

        if (triggered && !isInCooldown(userId)) {

            String riderName = user.getFirstName() + " " + user.getLastName();

            emergencyAlertService.sendAlertsForUser(saved, riderName, customMessage);
        }

        return saved;
    }

    private boolean isInCooldown(UUID userId) {

        LocalDateTime cooldownStart =
                LocalDateTime.now().minusSeconds(tiltConfig.getCooldownSeconds());

        List<TiltEvent> events =
                tiltEventRepository.findByUserIdAndTriggeredOrderByEventTimeDesc(userId, true);

        return events.stream()
                .anyMatch(e -> e.getEventTime().isAfter(cooldownStart));
    }

    public List<TiltEvent> getUserTiltHistory(UUID userId) {
        return tiltEventRepository.findByUserIdOrderByEventTimeDesc(userId);
    }

    public List<TiltEvent> getUserTriggeredEvents(UUID userId) {
        return tiltEventRepository.findByUserIdAndTriggeredOrderByEventTimeDesc(userId, true);
    }
}