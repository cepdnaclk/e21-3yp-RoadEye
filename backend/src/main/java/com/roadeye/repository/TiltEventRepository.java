package com.roadeye.repository;

import com.roadeye.model.TiltEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.UUID;

@Repository
public interface TiltEventRepository extends JpaRepository<TiltEvent, UUID> {

    // All events for a user, most recent first
    List<TiltEvent> findByUserIdOrderByEventTimeDesc(UUID userId);

    // Only triggered events (angle >= threshold)
    List<TiltEvent> findByUserIdAndTriggeredOrderByEventTimeDesc(UUID userId, Boolean triggered);
}