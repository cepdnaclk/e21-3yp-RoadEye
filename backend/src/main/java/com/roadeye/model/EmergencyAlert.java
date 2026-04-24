package com.roadeye.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * EmergencyAlert entity
 * Tracks every alert message sent to every emergency contact.
 * Gives a full audit log of who was notified, when, and via what channel.
 */
@Entity
@Table(name = "emergency_alerts")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EmergencyAlert {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    // The tilt event that triggered this alert
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tilt_event_id", nullable = false)
    private TiltEvent tiltEvent;

    // Which contact was notified
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "emergency_contact_id", nullable = false)
    private EmergencyContact emergencyContact;

    // Channel used: SMS, EMAIL, BOTH
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private EmergencyContact.ContactChannel channel;

    // Did the send succeed?
    @Column(nullable = false)
    private Boolean success;

    // Error message if failed
    @Column(length = 500)
    private String errorMessage;

    // External provider message ID (e.g. Twilio SID)
    @Column(length = 255)
    private String externalMessageId;

    @Column(nullable = false)
    private LocalDateTime sentAt;

    @PrePersist
    public void onCreate() {
        this.sentAt = LocalDateTime.now();
    }
}
