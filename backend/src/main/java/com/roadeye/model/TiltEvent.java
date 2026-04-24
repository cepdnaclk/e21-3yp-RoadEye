package com.roadeye.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * TiltEvent entity
 * Records every tilt reading from the bike sensor.
 * When tiltAngle >= threshold, an emergency is triggered.
 */
@Entity
@Table(name = "tilt_events")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TiltEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    // The user whose bike sent this event
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    // Raw tilt angle in degrees received from sensor
    @Column(nullable = false)
    private Double tiltAngle;

    // Threshold at time of event (stored for audit trail)
    @Column(nullable = false)
    private Double threshold;

    // Was this angle above threshold? i.e. did it trigger an alert?
    @Column(nullable = false)
    private Boolean triggered;

    // Timestamp of the event
    @Column(nullable = false)
    private LocalDateTime eventTime;

    // Optional: GPS coordinates at time of tilt
    @Column
    private Double latitude;

    @Column
    private Double longitude;

    @PrePersist
    public void onCreate() {
        this.eventTime = LocalDateTime.now();
    }
}