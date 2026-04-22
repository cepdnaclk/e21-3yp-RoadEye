package com.roadeye.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

/**
 * Ride entity - represents a single ride/trip
 */
@Entity
@Table(name = "rides")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Ride {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false)
    private LocalDateTime startedAt;

    @Column(nullable = false)
    private LocalDateTime endedAt;

    @Column(nullable = false)
    private Double distanceKm;

    @Column(columnDefinition = "DECIMAL(5,2) DEFAULT 0")
    private Double avgSpeedKmh = 0.0;

    @Column(columnDefinition = "DECIMAL(5,2) DEFAULT 0")
    private Double maxSpeedKmh = 0.0;

    @Column(columnDefinition = "INTEGER DEFAULT 0")
    private Integer harshBrakes = 0;

    @Column(columnDefinition = "INTEGER DEFAULT 0")
    private Integer harshAccels = 0;

    @Column(columnDefinition = "INTEGER DEFAULT 0")
    private Integer aggressiveTilts = 0;

    @Column(columnDefinition = "DECIMAL(3,1) DEFAULT 0")
    private Double roadQualityScore = 0.0;

    @Column(columnDefinition = "DECIMAL(3,1) DEFAULT 100")
    private Double safetyScore = 100.0;

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
