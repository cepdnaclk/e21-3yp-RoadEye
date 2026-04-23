package com.roadeye.dto;

import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RideDTO {
    private Long id;
    private Long userId;
    private String startTime;
    private String endTime;
    private Double startLatitude;
    private Double startLongitude;
    private Double endLatitude;
    private Double endLongitude;
    private Double distanceKm;
    private Integer durationMinutes;
    private Double avgSpeedKmh;
    private Double maxSpeedKmh;
}
