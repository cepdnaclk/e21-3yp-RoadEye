package com.roadeye.service;

import com.roadeye.dto.RideDTO;
import com.roadeye.model.Ride;
import com.roadeye.model.User;
import com.roadeye.repository.RideRepository;
import com.roadeye.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class RideService {
    private final RideRepository rideRepository;
    private final UserRepository userRepository;

    public Ride startRide(Long userId, Double startLatitude, Double startLongitude) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        Ride ride = Ride.builder()
                .user(user)
                .startTime(LocalDateTime.now())
                .startLatitude(startLatitude)
                .startLongitude(startLongitude)
                .build();
        
        return rideRepository.save(ride);
    }

    public Ride endRide(Long rideId, Double endLatitude, Double endLongitude, 
                        Double distanceKm, Double avgSpeedKmh, Double maxSpeedKmh) {
        Ride ride = getRideById(rideId);
        ride.setEndTime(LocalDateTime.now());
        ride.setEndLatitude(endLatitude);
        ride.setEndLongitude(endLongitude);
        ride.setDistanceKm(distanceKm);
        ride.setAvgSpeedKmh(avgSpeedKmh);
        ride.setMaxSpeedKmh(maxSpeedKmh);
        
        if (ride.getStartTime() != null && ride.getEndTime() != null) {
            long minutes = java.time.temporal.ChronoUnit.MINUTES
                    .between(ride.getStartTime(), ride.getEndTime());
            ride.setDurationMinutes((int) minutes);
        }
        
        return rideRepository.save(ride);
    }

    public Ride getRideById(Long id) {
        return rideRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Ride not found with id: " + id));
    }

    @Transactional(readOnly = true)
    public List<RideDTO> getUserRides(Long userId) {
        return rideRepository.findByUserIdOrderByStartTimeDesc(userId).stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    public void deleteRide(Long id) {
        rideRepository.deleteById(id);
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
}
