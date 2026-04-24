package com.roadeye.repository;

import com.roadeye.model.EmergencyContact;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface EmergencyContactRepository extends JpaRepository<EmergencyContact, Long> {
    List<EmergencyContact> findByUserId(Long userId);
    List<EmergencyContact> findByUserIdAndEnabled(Long userId, Boolean enabled);
}
