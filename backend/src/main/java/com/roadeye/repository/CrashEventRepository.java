package com.roadeye.repository;

import com.roadeye.model.CrashEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface CrashEventRepository extends JpaRepository<CrashEvent, Long> {
    List<CrashEvent> findByUserId(Long userId);
    List<CrashEvent> findByUserIdOrderByOccurredAtDesc(Long userId);
    List<CrashEvent> findByRideId(Long rideId);
}
