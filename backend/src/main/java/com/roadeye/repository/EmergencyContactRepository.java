package com.roadeye.repository;

import com.roadeye.model.EmergencyContact;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.UUID;

@Repository
public interface EmergencyContactRepository extends JpaRepository<EmergencyContact, Long> {
    List<EmergencyContact> findByUserId(UUID userId);

    List<EmergencyContact> findByUserIdAndEnabled(UUID userId, Boolean enabled);
}
