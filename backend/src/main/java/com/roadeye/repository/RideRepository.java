package com.roadeye.repository;

import com.roadeye.model.Ride;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Repository
public interface RideRepository extends JpaRepository<Ride, UUID> {
    List<Ride> findByUserId(UUID userId);

    List<Ride> findByUserIdOrderByStartTimeDesc(UUID userId);

    List<Ride> findByUserIdAndStartTimeBetween(
            UUID userId,
            LocalDateTime startTime,
            LocalDateTime endTime);
}
