package com.roadeye.service;

import com.roadeye.model.SpeedEvent;
import com.roadeye.model.User;
import com.roadeye.repository.SpeedEventRepository;
import com.roadeye.repository.UserRepository;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class SpeedEventService {

    private final SpeedEventRepository speedRepo;
    private final UserRepository userRepo;

    //SAVE SPEED (called frequently)
    //Returns the saved event so the controller can return speed back to frontend.
    public void saveSpeed(UUID userId,
                          Double speed,
                          Double lat,
                          Double lon) {

        if (speed == null) return; // safety

        User user = userRepo.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found" + userId));

        SpeedEvent event = SpeedEvent.builder()
                .user(user)
                .speed(speed)
                .latitude(lat)
                .longitude(lon)
                .eventTime(LocalDateTime.now())
                .build();

        return speedRepo.save(event);
    }

    /**
     * Most recent speed reading for a user.
     * Used by the dashboard to show confirmed live speed.
     */
    public Optional<SpeedEvent> getLatestSpeed(UUID userId) {
        return speedRepo.findTopByUserIdOrderByEventTimeDesc(userId);
    }

    /**
     * Get today's speed data for a user.
     * Used by the dashboard to show speed history.
     */
    public List<SpeedEvent> getTodaySpeeds(UUID userId) {

        LocalDateTime start = LocalDate.now().atStartOfDay();
        LocalDateTime end   = LocalDate.now().atTime(23, 59, 59);

        return speedRepo.findByUserIdAndEventTimeBetweenOrderByEventTimeAsc(
                userId, start, end
        );
    }
}