package com.roadeye.service;

import com.roadeye.model.CrashEvent;
import com.roadeye.model.EmergencyContact;
import com.roadeye.model.User;
import com.roadeye.repository.CrashEventRepository;
import com.roadeye.repository.EmergencyContactRepository;
import com.roadeye.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class CrashEventService {

    private final CrashEventRepository crashEventRepository;
    private final EmergencyContactRepository emergencyContactRepository;
    private final UserRepository userRepository;

    /**
     * Report a crash event
     */
    public CrashEvent reportCrashEvent(Long userId, CrashEvent crashData) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (crashData.getLatitude() == null || crashData.getLongitude() == null || crashData.getSeverityScore() == null) {
            throw new IllegalArgumentException("Missing required crash fields (latitude, longitude, severityScore)");
        }

        CrashEvent crash = CrashEvent.builder()
                .user(user)
                .ride(crashData.getRide())
                .occurredAt(crashData.getOccurredAt())
                .latitude(crashData.getLatitude())
                .longitude(crashData.getLongitude())
                .severityScore(crashData.getSeverityScore())
                .alertsSent(false)
                .build();

        CrashEvent savedCrash = crashEventRepository.save(crash);

        // Automatically notify emergency contacts if severity is high
        if (savedCrash.getSeverityScore() > 7.0) {
            notifyEmergencyContacts(userId, savedCrash);
        }

        return savedCrash;
    }

    /**
     * Get all crash events for a user
     */
    public List<CrashEvent> getUserCrashEvents(Long userId) {
        return crashEventRepository.findByUserIdOrderByOccurredAtDesc(userId);
    }

    /**
     * Get crash event by ID
     */
    public CrashEvent getCrashEventById(Long crashId) {
        return crashEventRepository.findById(crashId)
                .orElseThrow(() -> new RuntimeException("Crash event not found"));
    }

    /**
     * Notify emergency contacts about the crash
     */
    @Transactional
    public void notifyEmergencyContacts(Long userId, CrashEvent crash) {
        List<EmergencyContact> contacts = emergencyContactRepository.findByUserIdAndEnabled(userId, true);

        for (EmergencyContact contact : contacts) {
            // TODO: Implement actual SMS/Email sending here
            // Send notification based on contact.getChannel()
            System.out.println("Sending crash notification to: " + contact.getPhone());
        }

        crash.setEmergencyContactsNotified(true);
        crash.setAlertsSent(true);
        crashEventRepository.save(crash);
    }

    /**
     * Get crash statistics for a user
     */
    public CrashStatistics getUserCrashStatistics(Long userId) {
        List<CrashEvent> crashes = crashEventRepository.findByUserId(userId);

        long severeCount = crashes.stream()
                .filter(c -> c.getSeverityScore() > 7.0)
                .count();

        return CrashStatistics.builder()
                .totalCrashes(crashes.size())
                .severeCrashes((int) severeCount)
                .notificationsNeeded((int) crashes.stream()
                        .filter(c -> !c.getEmergencyContactsNotified())
                        .count())
                .build();
    }

    /**
     * Statistics DTO
     */
    @lombok.Data
    @lombok.Builder
    public static class CrashStatistics {
        private Integer totalCrashes;
        private Integer severeCrashes;
        private Integer notificationsNeeded;
    }
}
