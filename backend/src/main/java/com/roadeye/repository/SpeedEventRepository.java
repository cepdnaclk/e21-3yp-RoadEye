package com.roadeye.repository;

import com.roadeye.model.SpeedEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface SpeedEventRepository extends JpaRepository<SpeedEvent, UUID> {

    // Today's speeds for chart
    List<SpeedEvent> findByUserIdAndEventTimeBetweenOrderByEventTimeAsc(
            UUID userId,
            LocalDateTime start,
            LocalDateTime end
    );

    // Most recent speed — for live display on dashboard
    Optional<SpeedEvent> findTopByUserIdOrderByEventTimeDesc(UUID userId);

    Optional<SpeedEvent> findTopByUserIdOrderBySpeedDesc(UUID userId); 
}

    