package com.roadeye.repository;

import com.roadeye.model.EmergencyAlert;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.UUID;

@Repository
public interface EmergencyAlertRepository extends JpaRepository<EmergencyAlert, UUID> {

    // All alerts sent for a specific tilt event
    List<EmergencyAlert> findByTiltEventId(UUID tiltEventId);

    // All alerts ever sent to a specific emergency contact
    List<EmergencyAlert> findByEmergencyContactId(UUID contactId);
}