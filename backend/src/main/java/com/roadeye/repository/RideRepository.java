package com.roadeye.repository;

import com.roadeye.model.Ride;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface RideRepository extends JpaRepository<Ride, Long> {
    List<Ride> findByUserId(Long userId);
    List<Ride> findByUserIdOrderByStartTimeDesc(Long userId);
    List<Ride> findByUserIdAndStartTimeBetween(
            Long userId,
            LocalDateTime startTime,
            LocalDateTime endTime
    );
}
