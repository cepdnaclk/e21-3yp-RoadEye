package com.roadeye.controller;

import com.roadeye.model.Ride;
import com.roadeye.service.RideService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/rides")
@RequiredArgsConstructor
public class RideController {

    private final RideService rideService;

    /**
     * POST /api/rides - Save a new ride
     */
    @PostMapping
    public ResponseEntity<?> saveRideSummary(
            @RequestParam Long userId,
            @RequestBody SaveRideRequest request) {
        try {
            Ride ride = Ride.builder()
                    .startedAt(LocalDateTime.parse(request.getStartedAt()))
                    .endedAt(LocalDateTime.parse(request.getEndedAt()))
                    .distanceKm(request.getDistanceKm())
                    .avgSpeedKmh(request.getAvgSpeedKmh())
                    .maxSpeedKmh(request.getMaxSpeedKmh())
                    .harshBrakes(request.getHarshBrakes())
                    .harshAccels(request.getHarshAccels())
                    .aggressiveTilts(request.getAggressiveTilts())
                    .roadQualityScore(request.getRoadQualityScore())
                    .build();

            Ride savedRide = rideService.saveRideSummary(userId, ride);
            return ResponseEntity.status(HttpStatus.CREATED).body(toDTO(savedRide));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body("Invalid ride data: " + e.getMessage());
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(e.getMessage());
        }
    }

    /**
     * GET /api/rides/{userId} - Get all rides for a user
     */
    @GetMapping("/user/{userId}")
    public ResponseEntity<?> getUserRides(@PathVariable Long userId) {
        List<Ride> rides = rideService.getUserRides(userId);
        List<RideDTO> rideDTOs = rides.stream().map(this::toDTO).collect(Collectors.toList());
        return ResponseEntity.ok(rideDTOs);
    }

    /**
     * GET /api/rides/{rideId} - Get specific ride
     */
    @GetMapping("/{rideId}")
    public ResponseEntity<?> getRideById(@PathVariable Long rideId) {
        try {
            Ride ride = rideService.getRideById(rideId);
            return ResponseEntity.ok(toDTO(ride));
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * GET /api/rides/stats/{userId} - Get ride statistics
     */
    @GetMapping("/stats/{userId}")
    public ResponseEntity<?> getRideStatistics(@PathVariable Long userId) {
        RideService.RideStatistics stats = rideService.getUserRideStatistics(userId);
        return ResponseEntity.ok(stats);
    }

    private RideDTO toDTO(Ride ride) {
        return RideDTO.builder()
                .id(ride.getId())
                .userId(ride.getUser().getId())
                .startedAt(ride.getStartedAt().toString())
                .endedAt(ride.getEndedAt().toString())
                .distanceKm(ride.getDistanceKm())
                .avgSpeedKmh(ride.getAvgSpeedKmh())
                .maxSpeedKmh(ride.getMaxSpeedKmh())
                .harshBrakes(ride.getHarshBrakes())
                .harshAccels(ride.getHarshAccels())
                .aggressiveTilts(ride.getAggressiveTilts())
                .roadQualityScore(ride.getRoadQualityScore())
                .safetyScore(ride.getSafetyScore())
                .build();
    }

    // DTOs
    @lombok.Data
    @lombok.AllArgsConstructor
    @lombok.NoArgsConstructor
    public static class SaveRideRequest {
        private String startedAt;
        private String endedAt;
        private Double distanceKm;
        private Double avgSpeedKmh;
        private Double maxSpeedKmh;
        private Integer harshBrakes;
        private Integer harshAccels;
        private Integer aggressiveTilts;
        private Double roadQualityScore;
    }

    @lombok.Data
    @lombok.Builder
    public static class RideDTO {
        private Long id;
        private Long userId;
        private String startedAt;
        private String endedAt;
        private Double distanceKm;
        private Double avgSpeedKmh;
        private Double maxSpeedKmh;
        private Integer harshBrakes;
        private Integer harshAccels;
        private Integer aggressiveTilts;
        private Double roadQualityScore;
        private Double safetyScore;
    }
}
