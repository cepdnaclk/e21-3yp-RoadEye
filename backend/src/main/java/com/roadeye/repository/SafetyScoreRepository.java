package com.roadeye.repository;

import com.roadeye.model.SafetyScore;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface SafetyScoreRepository extends JpaRepository<SafetyScore, UUID> {

    List<SafetyScore> findByUserId(UUID userId);

    Optional<SafetyScore> findTopByUserIdOrderByCalculatedAtDesc(UUID userId);
}