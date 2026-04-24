package com.roadeye.dto;

import lombok.*;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CrashEventDTO {
    private Long id;
    private UUID userId;
    private Long rideId;
    private String occurredAt;
    private Double latitude;
    private Double longitude;
    private Double severityScore;
    private String description;
    private String evidencePhotoUrl;
    private Boolean isNotified;
    private String createdAt;
}
