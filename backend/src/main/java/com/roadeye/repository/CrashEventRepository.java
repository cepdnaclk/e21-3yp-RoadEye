package com.roadeye.repository;

import com.roadeye.model.CrashEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.UUID;

@Repository
public interface CrashEventRepository extends JpaRepository<CrashEvent, Long> {
    List<CrashEvent> findByUserId(UUID userId);

    List<CrashEvent> findByUserIdOrderByOccurredAtDesc(UUID userId);

    List<CrashEvent> findByRideId(Long rideId);
}
