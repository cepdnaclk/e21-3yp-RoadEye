package com.roadeye.repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.roadeye.model.TiltEvent;

@Repository
public interface TiltEventRepository extends JpaRepository<TiltEvent, UUID> {

    List<TiltEvent> findByUserIdOrderByEventTimeDesc(UUID userId);

    List<TiltEvent> findByUserIdAndTriggeredOrderByEventTimeDesc(
            UUID userId,
            Boolean triggered
    );

    List<TiltEvent> findByUserIdAndEventTimeBetweenOrderByEventTimeAsc(
            UUID userId,
            LocalDateTime start,
            LocalDateTime end
    );
}