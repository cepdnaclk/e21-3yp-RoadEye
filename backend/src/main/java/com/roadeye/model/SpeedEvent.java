package com.roadeye.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;
import com.fasterxml.jackson.annotation.JsonIgnore;

@Entity
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SpeedEvent {

    @Id
    @GeneratedValue
    private UUID id;

    // @ManyToOne
    // private User user;
    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    private Double speed;

    private Double latitude;
    private Double longitude;

    private LocalDateTime eventTime;
}