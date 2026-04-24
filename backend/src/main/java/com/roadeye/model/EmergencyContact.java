package com.roadeye.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * EmergencyContact entity - stores emergency contact information for users
 */
@Entity
@Table(name = "emergency_contacts")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EmergencyContact {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String phone;

    @Column(length = 255)
    private String email;

    @Column(length = 100)
    private String relationship;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ContactChannel channel;

    @Column(columnDefinition = "BOOLEAN DEFAULT TRUE")
    private Boolean enabled = true;

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

    public enum ContactChannel {
        SMS, EMAIL, BOTH
    }
}
