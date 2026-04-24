package com.roadeye.controller;

import com.roadeye.dto.RideDTO;
import com.roadeye.model.Ride;
import com.roadeye.service.RideService;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/rides")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class RideController {

    private final RideService rideService;

    @PostMapping("/start")
    public ResponseEntity<?> startRide(
            @RequestParam UUID userId,
            @RequestBody StartRideRequest request) {
        try {
            Ride ride = rideService.startRide(userId, request.getLatitude(), request.getLongitude());
            return ResponseEntity.status(HttpStatus.CREATED).body(toDTO(ride));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(e.getMessage());
        }
    }

    @PostMapping("/{rideId}/end")
    public ResponseEntity<?> endRide(
            @PathVariable Long rideId,
            @RequestBody EndRideRequest request) {
        try {
            Ride ride = rideService.endRide(rideId, request.getEndLatitude(),
                    request.getEndLongitude(), request.getDistanceKm(),
                    request.getAvgSpeedKmh(), request.getMaxSpeedKmh());
            return ResponseEntity.ok(toDTO(ride));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(e.getMessage());
        }
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<List<RideDTO>> getUserRides(@PathVariable UUID userId) {
        return ResponseEntity.ok(rideService.getUserRides(userId));
    }

    @GetMapping("/{rideId}")
    public ResponseEntity<?> getRideById(@PathVariable Long rideId) {
        try {
            Ride ride = rideService.getRideById(rideId);
            return ResponseEntity.ok(toDTO(ride));
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @DeleteMapping("/{rideId}")
    public ResponseEntity<?> deleteRide(@PathVariable Long rideId) {
        rideService.deleteRide(rideId);
        return ResponseEntity.ok("Ride deleted successfully");
    }

    private RideDTO toDTO(Ride ride) {
        return RideDTO.builder()
                .id(ride.getId())
                .userId(ride.getUser().getId())
                .startTime(ride.getStartTime().toString())
                .endTime(ride.getEndTime() != null ? ride.getEndTime().toString() : null)
                .startLatitude(ride.getStartLatitude())
                .startLongitude(ride.getStartLongitude())
                .endLatitude(ride.getEndLatitude())
                .endLongitude(ride.getEndLongitude())
                .distanceKm(ride.getDistanceKm())
                .durationMinutes(ride.getDurationMinutes())
                .avgSpeedKmh(ride.getAvgSpeedKmh())
                .maxSpeedKmh(ride.getMaxSpeedKmh())
                .build();
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class StartRideRequest {
        private Double latitude;
        private Double longitude;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class EndRideRequest {
        private Double endLatitude;
        private Double endLongitude;
        private Double distanceKm;
        private Double avgSpeedKmh;
        private Double maxSpeedKmh;
    }
}
