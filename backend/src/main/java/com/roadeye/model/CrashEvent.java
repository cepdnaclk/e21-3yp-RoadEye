package com.roadeye.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * CrashEvent entity - represents a detected crash/accident
 */
@Entity
@Table(name = "crash_events")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CrashEvent {

    @Id
    @org.hibernate.annotations.UuidGenerator
    @GeneratedValue
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ride_id")
    private Ride ride;

    @Column(nullable = false)
    private LocalDateTime occurredAt;

    @Column(nullable = false)
    private Double latitude;

    @Column(nullable = false)
    private Double longitude;

    @Column(nullable = false)
    private Double severityScore;

    @Column(columnDefinition = "BOOLEAN DEFAULT FALSE")
    private Boolean alertsSent = false;

    @Column(columnDefinition = "BOOLEAN DEFAULT FALSE")
    private Boolean emergencyContactsNotified = false;

    @Column(length = 500)
    private String description;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    @Column(nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    public void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    public void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
