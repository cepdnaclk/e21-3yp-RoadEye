package com.roadeye.service;

import com.roadeye.model.Ride;
import com.roadeye.model.User;
import com.roadeye.repository.RideRepository;
import com.roadeye.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class RideService {

    private final RideRepository rideRepository;
    private final UserRepository userRepository;

    /**
     * Save or create a ride summary
     */
    public Ride saveRideSummary(Long userId, Ride rideData) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (rideData.getStartedAt() == null || rideData.getEndedAt() == null || rideData.getDistanceKm() == null) {
            throw new IllegalArgumentException("Missing required ride fields (startedAt, endedAt, distanceKm)");
        }

        Ride ride = Ride.builder()
                .user(user)
                .startedAt(rideData.getStartedAt())
                .endedAt(rideData.getEndedAt())
                .distanceKm(rideData.getDistanceKm())
                .avgSpeedKmh(rideData.getAvgSpeedKmh() != null ? rideData.getAvgSpeedKmh() : 0.0)
                .maxSpeedKmh(rideData.getMaxSpeedKmh() != null ? rideData.getMaxSpeedKmh() : 0.0)
                .harshBrakes(rideData.getHarshBrakes() != null ? rideData.getHarshBrakes() : 0)
                .harshAccels(rideData.getHarshAccels() != null ? rideData.getHarshAccels() : 0)
                .aggressiveTilts(rideData.getAggressiveTilts() != null ? rideData.getAggressiveTilts() : 0)
                .roadQualityScore(rideData.getRoadQualityScore() != null ? rideData.getRoadQualityScore() : 0.0)
                .build();

        return rideRepository.save(ride);
    }

    /**
     * Get all rides for a user
     */
    public List<Ride> getUserRides(Long userId) {
        return rideRepository.findByUserIdOrderByStartedAtDesc(userId);
    }

    /**
     * Get ride by ID
     */
    public Ride getRideById(Long rideId) {
        return rideRepository.findById(rideId)
                .orElseThrow(() -> new RuntimeException("Ride not found"));
    }

    /**
     * Get ride statistics for a user
     */
    public RideStatistics getUserRideStatistics(Long userId) {
        List<Ride> rides = rideRepository.findByUserId(userId);

        double totalDistance = rides.stream()
                .mapToDouble(Ride::getDistanceKm)
                .sum();

        double avgSpeed = rides.isEmpty() ? 0 : rides.stream()
                .mapToDouble(Ride::getAvgSpeedKmh)
                .average()
                .orElse(0);

        int totalHarshBrakes = rides.stream()
                .mapToInt(Ride::getHarshBrakes)
                .sum();

        return RideStatistics.builder()
                .totalRides(rides.size())
                .totalDistanceKm(totalDistance)
                .avgSpeedKmh(avgSpeed)
                .totalHarshBrakes(totalHarshBrakes)
                .build();
    }

    /**
     * Statistics DTO
     */
    @lombok.Data
    @lombok.Builder
    public static class RideStatistics {
        private Integer totalRides;
        private Double totalDistanceKm;
        private Double avgSpeedKmh;
        private Integer totalHarshBrakes;
    }
}
