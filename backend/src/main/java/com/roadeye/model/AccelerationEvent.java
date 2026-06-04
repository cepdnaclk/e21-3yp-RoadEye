package com.roadeye.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;
import com.fasterxml.jackson.annotation.JsonIgnore;

@Entity
@Table(name = "acceleration_event")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AccelerationEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    private Double acceleration;   // m/s²
    private Double tiltAngle;      // degrees
    private Double latitude;
    private Double longitude;

    @Column(name = "event_time")
    private LocalDateTime eventTime;

    @PrePersist
    public void onCreate() {
        if (this.eventTime == null) {
            this.eventTime = LocalDateTime.now();
        }
    }
}
