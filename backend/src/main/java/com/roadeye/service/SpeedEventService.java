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
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class SpeedEventService {

    private final SpeedEventRepository speedRepo;
    private final UserRepository userRepo;

    // 🔹 SAVE SPEED (called frequently)
    public void saveSpeed(UUID userId,
                          Double speed,
                          Double lat,
                          Double lon) {

        if (speed == null) return; // safety

        User user = userRepo.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        SpeedEvent event = SpeedEvent.builder()
                .user(user)
                .speed(speed)
                .latitude(lat)
                .longitude(lon)
                .eventTime(LocalDateTime.now())
                .build();

        speedRepo.save(event);
    }

    // 🔹 GET TODAY’S SPEED DATA
    public List<SpeedEvent> getTodaySpeeds(UUID userId) {

        LocalDateTime start = LocalDate.now().atStartOfDay();
        LocalDateTime end   = LocalDate.now().atTime(23, 59, 59);

        return speedRepo.findByUserIdAndEventTimeBetweenOrderByEventTimeAsc(
                userId, start, end
        );
    }
}