package com.roadeye.repository;

import com.roadeye.model.Ride;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
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
    
    @Query("SELECT COALESCE(SUM(r.distanceKm), 0.0) FROM Ride r WHERE r.user.id = :userId AND r.distanceKm IS NOT NULL")
    Double getTotalDistanceByUserId(@Param("userId") UUID userId);
}
