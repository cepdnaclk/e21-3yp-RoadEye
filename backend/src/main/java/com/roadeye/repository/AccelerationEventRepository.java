package com.roadeye.repository;

import com.roadeye.model.AccelerationEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface AccelerationEventRepository extends JpaRepository<AccelerationEvent, UUID> {

    Optional<AccelerationEvent> findTopByUserIdOrderByEventTimeDesc(UUID userId);

    List<AccelerationEvent> findByUserIdOrderByEventTimeDesc(UUID userId);

    List<AccelerationEvent> findByUserIdAndEventTimeBetween(
        UUID userId, LocalDateTime start, LocalDateTime end);
}