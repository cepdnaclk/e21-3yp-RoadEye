package com.roadeye.controller;

import com.roadeye.model.CrashEvent;
import com.roadeye.service.CrashEventService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/crashes")
@RequiredArgsConstructor
public class CrashEventController {

    private final CrashEventService crashEventService;

    /**
     * POST /api/crashes - Report a crash event
     */
    @PostMapping
    public ResponseEntity<?> reportCrashEvent(
            @RequestParam UUID userId,
            @RequestBody ReportCrashRequest request) {
        try {
            CrashEvent crash = CrashEvent.builder()
                    .occurredAt(LocalDateTime.parse(request.getOccurredAt()))
                    .latitude(request.getLatitude())
                    .longitude(request.getLongitude())
                    .severityScore(request.getSeverityScore())
                    .description(request.getDescription())
                    .build();

            CrashEvent savedCrash = crashEventService.reportCrashEvent(userId, crash);
            return ResponseEntity.status(HttpStatus.CREATED).body(toDTO(savedCrash));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body("Invalid crash data: " + e.getMessage());
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(e.getMessage());
        }
    }

    /**
     * GET /api/crashes/user/{userId} - Get all crashes for a user
     */
    @GetMapping("/user/{userId}")
    public ResponseEntity<?> getUserCrashEvents(@PathVariable UUID userId) {
        List<CrashEvent> crashes = crashEventService.getUserCrashEvents(userId);
        List<CrashEventDTO> crashDTOs = crashes.stream().map(this::toDTO).collect(Collectors.toList());
        return ResponseEntity.ok(crashDTOs);
    }

    /**
     * GET /api/crashes/{crashId} - Get specific crash event
     */
    @GetMapping("/{crashId}")
    public ResponseEntity<?> getCrashEventById(@PathVariable UUID crashId) {
        try {
            CrashEvent crash = crashEventService.getCrashEventById(crashId);
            return ResponseEntity.ok(toDTO(crash));
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * POST /api/crashes/{crashId}/notify - Notify emergency contacts
     */
    @PostMapping("/{crashId}/notify")
    public ResponseEntity<?> notifyEmergencyContacts(
            @PathVariable UUID crashId,
            @RequestParam UUID userId) {
        try {
            CrashEvent crash = crashEventService.getCrashEventById(crashId);
            crashEventService.notifyEmergencyContacts(userId, crash);
            return ResponseEntity.ok("Emergency contacts notified");
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * GET /api/crashes/stats/{userId} - Get crash statistics
     */
    @GetMapping("/stats/{userId}")
    public ResponseEntity<?> getCrashStatistics(@PathVariable UUID userId) {
        CrashEventService.CrashStatistics stats = crashEventService.getUserCrashStatistics(userId);
        return ResponseEntity.ok(stats);
    }

    private CrashEventDTO toDTO(CrashEvent crash) {
        return CrashEventDTO.builder()
                .id(crash.getId())
                .userId(crash.getUser().getId())
                .rideId(crash.getRide() != null ? crash.getRide().getId() : null)
                .occurredAt(crash.getOccurredAt().toString())
                .latitude(crash.getLatitude())
                .longitude(crash.getLongitude())
                .severityScore(crash.getSeverityScore())
                .alertsSent(crash.getAlertsSent())
                .emergencyContactsNotified(crash.getEmergencyContactsNotified())
                .description(crash.getDescription())
                .build();
    }

    // DTOs
    @lombok.Data
    @lombok.AllArgsConstructor
    @lombok.NoArgsConstructor
    public static class ReportCrashRequest {
        private String occurredAt;
        private Double latitude;
        private Double longitude;
        private Double severityScore;
        private String description;
    }

    @lombok.Data
    @lombok.Builder
    public static class CrashEventDTO {
        private UUID id;
        private UUID userId;
        private UUID rideId;
        private String occurredAt;
        private Double latitude;
        private Double longitude;
        private Double severityScore;
        private Boolean alertsSent;
        private Boolean emergencyContactsNotified;
        private String description;
    }
}
