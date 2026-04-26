package com.roadeye.repository;

import com.roadeye.model.SpeedEvent;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public interface SpeedEventRepository extends JpaRepository<SpeedEvent, UUID> {

    List<SpeedEvent> findByUserIdAndEventTimeBetweenOrderByEventTimeAsc(
            UUID userId,
            LocalDateTime start,
            LocalDateTime end
    );
}
