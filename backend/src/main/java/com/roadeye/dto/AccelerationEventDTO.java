package com.roadeye.dto;

import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AccelerationEventDTO {
    private UUID id;
    private UUID userId;
    private Double acceleration;
    private Double tiltAngle;
    private Double latitude;
    private Double longitude;
    private LocalDateTime eventTime;
}
