# Firebase to Spring Boot + PostgreSQL Migration Guide

## Overview

This guide walks you through completely removing Firebase from the backend and replacing it with a Spring Boot + PostgreSQL stack using Spring Initializer patterns.

---

## Phase 1: Database Setup

### Step 1: Install and Configure PostgreSQL

#### On Windows:

1. Download PostgreSQL from https://www.postgresql.org/download/windows/
2. Run the installer and note the postgres user password
3. After installation, open pgAdmin (comes with PostgreSQL)
4. Create a new database:
   ```sql
   -- In pgAdmin Query Tool
   CREATE DATABASE roadeye_db;
   CREATE USER roadeye_user WITH PASSWORD 'roadeye_password';
   ALTER ROLE roadeye_user SET client_encoding TO 'utf8';
   ALTER ROLE roadeye_user SET default_transaction_isolation TO 'read committed';
   ALTER ROLE roadeye_user SET default_transaction_deferrable TO on;
   GRANT ALL PRIVILEGES ON DATABASE roadeye_db TO roadeye_user;
   ```

#### Alternative: Using Command Line

```bash
# After PostgreSQL is installed, open psql
psql -U postgres

# Then run:
CREATE DATABASE roadeye_db;
CREATE USER roadeye_user WITH PASSWORD 'roadeye_password';
ALTER ROLE roadeye_user SET client_encoding TO 'utf8';
ALTER ROLE roadeye_user SET default_transaction_isolation TO 'read committed';
ALTER ROLE roadeye_user SET default_transaction_deferrable TO on;
GRANT ALL PRIVILEGES ON DATABASE roadeye_db TO roadeye_user;
```

### Step 2: Verify PostgreSQL Connection

```bash
psql -U roadeye_user -d roadeye_db -h localhost
# Should connect successfully
```

---

## Phase 2: Clean Up Firebase Files

### Step 3: Remove Firebase Configuration Files

Delete these files from the backend root folder:

- [ ] `backend/firebase.json`
- [ ] `backend/firestore.rules`
- [ ] `backend/firestore.indexes.json`
- [ ] `backend/functions/` (entire folder - TypeScript Cloud Functions)

Keep these (already migrated to Spring Boot):

- `backend/pom.xml` (updated with Spring Boot + PostgreSQL)
- `backend/src/main/resources/application.yml`
- `backend/src/main/java/com/roadeye/` (all Java code)

### Step 4: Remove Firebase from Root

Delete these files from the workspace root:

- [ ] `firebase.json`
- [ ] `firestore.rules`
- [ ] `firestore.indexes.json`

Keep:

- `backend/` (updated Spring Boot backend)
- `Frontend/` (unchanged - no modifications)

---

## Phase 3: Backend Structure Setup

### Step 5: Complete Entity Models

Create all JPA Entity classes in `backend/src/main/java/com/roadeye/model/`:

**1. User.java**

```java
package com.roadeye.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "users")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(nullable = false)
    private String passwordHash;

    @Column(nullable = false)
    private String firstName;

    @Column(nullable = false)
    private String lastName;

    @Column(unique = true)
    private String phoneNumber;

    @Column(name = "date_of_birth")
    private String dateOfBirth;

    @Column(name = "profile_picture_url")
    private String profilePictureUrl;

    @Column(name = "is_active")
    private Boolean isActive = true;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at")
    private LocalDateTime updatedAt = LocalDateTime.now();

    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<Ride> rides = new ArrayList<>();

    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<CrashEvent> crashEvents = new ArrayList<>();

    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<EmergencyContact> emergencyContacts = new ArrayList<>();

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
```

**2. Ride.java**

```java
package com.roadeye.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "rides")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Ride {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "start_time", nullable = false)
    private LocalDateTime startTime;

    @Column(name = "end_time")
    private LocalDateTime endTime;

    @Column(name = "start_latitude")
    private Double startLatitude;

    @Column(name = "start_longitude")
    private Double startLongitude;

    @Column(name = "end_latitude")
    private Double endLatitude;

    @Column(name = "end_longitude")
    private Double endLongitude;

    @Column(name = "distance_km")
    private Double distanceKm;

    @Column(name = "duration_minutes")
    private Integer durationMinutes;

    @Column(name = "avg_speed_kmh")
    private Double avgSpeedKmh;

    @Column(name = "max_speed_kmh")
    private Double maxSpeedKmh;

    @Column(name = "route_data")
    @Lob
    private String routeData; // JSON format

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at")
    private LocalDateTime updatedAt = LocalDateTime.now();

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
```

**3. CrashEvent.java**

```java
package com.roadeye.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "crash_events")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CrashEvent {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ride_id")
    private Ride ride;

    @Column(name = "occurred_at", nullable = false)
    private LocalDateTime occurredAt;

    @Column(name = "latitude", nullable = false)
    private Double latitude;

    @Column(name = "longitude", nullable = false)
    private Double longitude;

    @Column(name = "severity_score")
    private Double severityScore; // 0-100

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "evidence_photo_url")
    private String evidencePhotoUrl;

    @Column(name = "is_notified")
    private Boolean isNotified = false;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at")
    private LocalDateTime updatedAt = LocalDateTime.now();

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
```

**4. EmergencyContact.java**

```java
package com.roadeye.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "emergency_contacts")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EmergencyContact {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "contact_name", nullable = false)
    private String contactName;

    @Column(name = "phone_number", nullable = false)
    private String phoneNumber;

    @Column(name = "email")
    private String email;

    @Column(name = "relationship")
    private String relationship; // e.g., "Parent", "Friend", "Spouse"

    @Column(name = "is_primary")
    private Boolean isPrimary = false;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at")
    private LocalDateTime updatedAt = LocalDateTime.now();

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
```

---

## Phase 4: Repository Layer

### Step 6: Create Spring Data JPA Repositories

Create interfaces in `backend/src/main/java/com/roadeye/repository/`:

**1. UserRepository.java**

```java
package com.roadeye.repository;

import com.roadeye.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
    Optional<User> findByPhoneNumber(String phoneNumber);
    boolean existsByEmail(String email);
}
```

**2. RideRepository.java**

```java
package com.roadeye.repository;

import com.roadeye.model.Ride;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface RideRepository extends JpaRepository<Ride, Long> {
    List<Ride> findByUserId(Long userId);
    List<Ride> findByUserIdOrderByStartTimeDesc(Long userId);
    List<Ride> findByUserIdAndStartTimeBetween(
        Long userId,
        LocalDateTime startTime,
        LocalDateTime endTime
    );
}
```

**3. CrashEventRepository.java**

```java
package com.roadeye.repository;

import com.roadeye.model.CrashEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface CrashEventRepository extends JpaRepository<CrashEvent, Long> {
    List<CrashEvent> findByUserId(Long userId);
    List<CrashEvent> findByUserIdOrderByOccurredAtDesc(Long userId);
    List<CrashEvent> findByRideId(Long rideId);
    List<CrashEvent> findByUserIdAndOccurredAtBetween(
        Long userId,
        LocalDateTime startTime,
        LocalDateTime endTime
    );
    long countByUserId(Long userId);
}
```

**4. EmergencyContactRepository.java**

```java
package com.roadeye.repository;

import com.roadeye.model.EmergencyContact;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface EmergencyContactRepository extends JpaRepository<EmergencyContact, Long> {
    List<EmergencyContact> findByUserId(Long userId);
    Optional<EmergencyContact> findByUserIdAndIsPrimaryTrue(Long userId);
    List<EmergencyContact> findByUserIdOrderByIsPrimaryDesc(Long userId);
}
```

---

## Phase 5: Service Layer

### Step 7: Create Business Logic Services

Create in `backend/src/main/java/com/roadeye/service/`:

**1. UserService.java**

```java
package com.roadeye.service;

import com.roadeye.dto.UserDTO;
import com.roadeye.model.User;
import com.roadeye.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class UserService {
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public User createUser(String email, String password, String firstName, String lastName) {
        if (userRepository.findByEmail(email).isPresent()) {
            throw new IllegalArgumentException("Email already exists");
        }

        User user = User.builder()
                .email(email)
                .passwordHash(passwordEncoder.encode(password))
                .firstName(firstName)
                .lastName(lastName)
                .isActive(true)
                .build();

        return userRepository.save(user);
    }

    public User getUserById(Long id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found with id: " + id));
    }

    public User getUserByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found with email: " + email));
    }

    public User updateUser(Long id, UserDTO dto) {
        User user = getUserById(id);
        if (dto.getFirstName() != null) user.setFirstName(dto.getFirstName());
        if (dto.getLastName() != null) user.setLastName(dto.getLastName());
        if (dto.getPhoneNumber() != null) user.setPhoneNumber(dto.getPhoneNumber());
        if (dto.getDateOfBirth() != null) user.setDateOfBirth(dto.getDateOfBirth());
        if (dto.getProfilePictureUrl() != null) user.setProfilePictureUrl(dto.getProfilePictureUrl());
        return userRepository.save(user);
    }

    public void deleteUser(Long id) {
        userRepository.deleteById(id);
    }

    @Transactional(readOnly = true)
    public List<UserDTO> getAllUsers() {
        return userRepository.findAll().stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    private UserDTO toDTO(User user) {
        return UserDTO.builder()
                .id(user.getId())
                .email(user.getEmail())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .phoneNumber(user.getPhoneNumber())
                .dateOfBirth(user.getDateOfBirth())
                .profilePictureUrl(user.getProfilePictureUrl())
                .isActive(user.getIsActive())
                .createdAt(user.getCreatedAt().toString())
                .build();
    }
}
```

**2. RideService.java**

```java
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
```

**3. CrashEventService.java**

```java
package com.roadeye.service;

import com.roadeye.dto.CrashEventDTO;
import com.roadeye.model.CrashEvent;
import com.roadeye.model.EmergencyContact;
import com.roadeye.model.User;
import com.roadeye.repository.CrashEventRepository;
import com.roadeye.repository.EmergencyContactRepository;
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
public class CrashEventService {
    private final CrashEventRepository crashEventRepository;
    private final UserRepository userRepository;
    private final EmergencyContactRepository emergencyContactRepository;
    private final EmailService emailService;

    public CrashEvent reportCrashEvent(Long userId, CrashEvent crash) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        crash.setUser(user);
        return crashEventRepository.save(crash);
    }

    public CrashEvent getCrashEventById(Long id) {
        return crashEventRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Crash event not found with id: " + id));
    }

    @Transactional(readOnly = true)
    public List<CrashEventDTO> getUserCrashEvents(Long userId) {
        return crashEventRepository.findByUserIdOrderByOccurredAtDesc(userId).stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    public void notifyEmergencyContacts(Long userId, CrashEvent crash) {
        List<EmergencyContact> contacts = emergencyContactRepository.findByUserId(userId);

        for (EmergencyContact contact : contacts) {
            // Send SMS/Email notification
            String message = String.format(
                "ALERT: %s has been in a crash at coordinates (%.4f, %.4f). Severity: %.1f/100",
                crash.getUser().getFirstName() + " " + crash.getUser().getLastName(),
                crash.getLatitude(),
                crash.getLongitude(),
                crash.getSeverityScore()
            );

            // TODO: Implement SMS sending (Twilio, AWS SNS, etc.)
            if (contact.getEmail() != null) {
                emailService.sendCrashAlert(contact.getEmail(), crash);
            }
        }

        crash.setIsNotified(true);
        crashEventRepository.save(crash);
    }

    public CrashStatistics getUserCrashStatistics(Long userId) {
        List<CrashEvent> crashes = crashEventRepository.findByUserId(userId);

        long totalCrashes = crashes.size();
        double avgSeverity = crashes.stream()
                .mapToDouble(c -> c.getSeverityScore() != null ? c.getSeverityScore() : 0)
                .average()
                .orElse(0);

        return CrashStatistics.builder()
                .totalCrashes(totalCrashes)
                .averageSeverityScore(avgSeverity)
                .build();
    }

    public void deleteCrashEvent(Long id) {
        crashEventRepository.deleteById(id);
    }

    private CrashEventDTO toDTO(CrashEvent crash) {
        return CrashEventDTO.builder()
                .id(crash.getId())
                .userId(crash.getUser().getId())
                .rideId(crash.getRide() != null ? crash.getRide().getId() : null)
                .occurredAt(crash.getOccurredAt().toString())
                .latitude(crash.getLatitude())
                .longitude(crash.getLongitude())
                .severityScore(crash.getSeverityScore())
                .description(crash.getDescription())
                .evidencePhotoUrl(crash.getEvidencePhotoUrl())
                .isNotified(crash.getIsNotified())
                .createdAt(crash.getCreatedAt().toString())
                .build();
    }

    @lombok.Data
    @lombok.Builder
    public static class CrashStatistics {
        private long totalCrashes;
        private double averageSeverityScore;
    }
}
```

**4. EmergencyContactService.java**

```java
package com.roadeye.service;

import com.roadeye.dto.EmergencyContactDTO;
import com.roadeye.model.EmergencyContact;
import com.roadeye.model.User;
import com.roadeye.repository.EmergencyContactRepository;
import com.roadeye.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class EmergencyContactService {
    private final EmergencyContactRepository emergencyContactRepository;
    private final UserRepository userRepository;

    public EmergencyContact addEmergencyContact(Long userId, EmergencyContactDTO dto) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        EmergencyContact contact = EmergencyContact.builder()
                .user(user)
                .contactName(dto.getContactName())
                .phoneNumber(dto.getPhoneNumber())
                .email(dto.getEmail())
                .relationship(dto.getRelationship())
                .isPrimary(dto.getIsPrimary() != null ? dto.getIsPrimary() : false)
                .build();

        return emergencyContactRepository.save(contact);
    }

    public EmergencyContact getEmergencyContactById(Long id) {
        return emergencyContactRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Emergency contact not found"));
    }

    @Transactional(readOnly = true)
    public List<EmergencyContactDTO> getUserEmergencyContacts(Long userId) {
        return emergencyContactRepository.findByUserIdOrderByIsPrimaryDesc(userId).stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    public EmergencyContact updateEmergencyContact(Long id, EmergencyContactDTO dto) {
        EmergencyContact contact = getEmergencyContactById(id);

        if (dto.getContactName() != null) contact.setContactName(dto.getContactName());
        if (dto.getPhoneNumber() != null) contact.setPhoneNumber(dto.getPhoneNumber());
        if (dto.getEmail() != null) contact.setEmail(dto.getEmail());
        if (dto.getRelationship() != null) contact.setRelationship(dto.getRelationship());
        if (dto.getIsPrimary() != null) contact.setIsPrimary(dto.getIsPrimary());

        return emergencyContactRepository.save(contact);
    }

    public void deleteEmergencyContact(Long id) {
        emergencyContactRepository.deleteById(id);
    }

    private EmergencyContactDTO toDTO(EmergencyContact contact) {
        return EmergencyContactDTO.builder()
                .id(contact.getId())
                .userId(contact.getUser().getId())
                .contactName(contact.getContactName())
                .phoneNumber(contact.getPhoneNumber())
                .email(contact.getEmail())
                .relationship(contact.getRelationship())
                .isPrimary(contact.getIsPrimary())
                .createdAt(contact.getCreatedAt().toString())
                .build();
    }
}
```

---

## Phase 6: DTO Classes

### Step 8: Create Data Transfer Objects

Create in `backend/src/main/java/com/roadeye/dto/`:

**1. UserDTO.java**

```java
package com.roadeye.dto;

import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserDTO {
    private Long id;
    private String email;
    private String firstName;
    private String lastName;
    private String phoneNumber;
    private String dateOfBirth;
    private String profilePictureUrl;
    private Boolean isActive;
    private String createdAt;
}
```

**2. RideDTO.java**

```java
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
```

**3. CrashEventDTO.java**

```java
package com.roadeye.dto;

import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CrashEventDTO {
    private Long id;
    private Long userId;
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
```

**4. EmergencyContactDTO.java**

```java
package com.roadeye.dto;

import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EmergencyContactDTO {
    private Long id;
    private Long userId;
    private String contactName;
    private String phoneNumber;
    private String email;
    private String relationship;
    private Boolean isPrimary;
    private String createdAt;
}
```

---

## Phase 7: REST Controllers

### Step 9: Create REST API Endpoints

Create in `backend/src/main/java/com/roadeye/controller/`:

**1. UserController.java**

```java
package com.roadeye.controller;

import com.roadeye.dto.UserDTO;
import com.roadeye.model.User;
import com.roadeye.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class UserController {
    private final UserService userService;

    @PostMapping
    public ResponseEntity<UserDTO> createUser(
            @RequestBody CreateUserRequest request) {
        User user = userService.createUser(
                request.getEmail(),
                request.getPassword(),
                request.getFirstName(),
                request.getLastName()
        );
        return ResponseEntity.status(HttpStatus.CREATED).body(toDTO(user));
    }

    @GetMapping("/{id}")
    public ResponseEntity<UserDTO> getUser(@PathVariable Long id) {
        User user = userService.getUserById(id);
        return ResponseEntity.ok(toDTO(user));
    }

    @GetMapping("/email/{email}")
    public ResponseEntity<UserDTO> getUserByEmail(@PathVariable String email) {
        User user = userService.getUserByEmail(email);
        return ResponseEntity.ok(toDTO(user));
    }

    @GetMapping
    public ResponseEntity<List<UserDTO>> getAllUsers() {
        return ResponseEntity.ok(userService.getAllUsers());
    }

    @PutMapping("/{id}")
    public ResponseEntity<UserDTO> updateUser(
            @PathVariable Long id,
            @RequestBody UserDTO dto) {
        User user = userService.updateUser(id, dto);
        return ResponseEntity.ok(toDTO(user));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteUser(@PathVariable Long id) {
        userService.deleteUser(id);
        return ResponseEntity.ok("User deleted successfully");
    }

    private UserDTO toDTO(User user) {
        return UserDTO.builder()
                .id(user.getId())
                .email(user.getEmail())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .phoneNumber(user.getPhoneNumber())
                .dateOfBirth(user.getDateOfBirth())
                .profilePictureUrl(user.getProfilePictureUrl())
                .isActive(user.getIsActive())
                .createdAt(user.getCreatedAt().toString())
                .build();
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CreateUserRequest {
        private String email;
        private String password;
        private String firstName;
        private String lastName;
    }
}
```

Continue with RideController, CrashEventController, and EmergencyContactController...

---

## Phase 8: Database Migrations

### Step 10: Create Flyway Database Migration Scripts

Create in `backend/src/main/resources/db/migration/`:

**V1\_\_Initial_Schema.sql**

```sql
-- Users Table
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone_number VARCHAR(20) UNIQUE,
    date_of_birth VARCHAR(10),
    profile_picture_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Rides Table
CREATE TABLE rides (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP,
    start_latitude DECIMAL(10, 8),
    start_longitude DECIMAL(11, 8),
    end_latitude DECIMAL(10, 8),
    end_longitude DECIMAL(11, 8),
    distance_km DECIMAL(10, 2),
    duration_minutes INTEGER,
    avg_speed_kmh DECIMAL(10, 2),
    max_speed_kmh DECIMAL(10, 2),
    route_data TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Crash Events Table
CREATE TABLE crash_events (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    ride_id BIGINT,
    occurred_at TIMESTAMP NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    severity_score DECIMAL(5, 2),
    description TEXT,
    evidence_photo_url TEXT,
    is_notified BOOLEAN DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (ride_id) REFERENCES rides(id) ON DELETE SET NULL
);

-- Emergency Contacts Table
CREATE TABLE emergency_contacts (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    contact_name VARCHAR(100) NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    email VARCHAR(255),
    relationship VARCHAR(50),
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_phone ON users(phone_number);
CREATE INDEX idx_rides_user_id ON rides(user_id);
CREATE INDEX idx_rides_start_time ON rides(start_time);
CREATE INDEX idx_crashes_user_id ON crash_events(user_id);
CREATE INDEX idx_crashes_occurred_at ON crash_events(occurred_at);
CREATE INDEX idx_emergency_contacts_user_id ON emergency_contacts(user_id);
```

---

## Phase 9: Application Configuration

### Step 11: Update Spring Boot Configuration

Update `backend/src/main/resources/application.yml`:

```yaml
# RoadEye Spring Boot Backend Configuration
server:
  port: 8080
  servlet:
    context-path: /
  compression:
    enabled: true

spring:
  application:
    name: RoadEye Backend

  # PostgreSQL Database Configuration
  datasource:
    url: jdbc:postgresql://localhost:5432/roadeye_db
    username: roadeye_user
    password: roadeye_password
    driver-class-name: org.postgresql.Driver
    hikari:
      maximum-pool-size: 20
      minimum-idle: 5
      connection-timeout: 20000

  # JPA/Hibernate Configuration
  jpa:
    hibernate:
      ddl-auto: validate
    properties:
      hibernate:
        dialect: org.hibernate.dialect.PostgreSQLDialect
        format_sql: true
        use_sql_comments: true
    show-sql: false

  # Flyway Configuration
  flyway:
    enabled: true
    locations: classpath:db/migration
    baseline-on-migrate: true
    out-of-order: false

logging:
  level:
    root: INFO
    com.roadeye: DEBUG
```

---

## Phase 10: Build and Test

### Step 12: Build the Backend

```bash
cd backend
mvn clean install
```

### Step 13: Run the Application

```bash
mvn spring-boot:run
```

The application should start on `http://localhost:8080`

### Step 14: Verify Database

Connect to PostgreSQL and check tables were created:

```bash
psql -U roadeye_user -d roadeye_db
\dt  # List all tables
```

---

## Phase 11: Update Frontend (if needed)

### Step 15: Update API URLs in Frontend

⚠️ **DO NOT MODIFY Frontend folder structure** - only update API endpoints if necessary.

If the frontend is still using Firebase client SDK, you may need to:

1. Remove Firebase SDK imports from `Frontend/src/firebaseConfig.ts` or update it
2. Update API calls to point to `http://localhost:8080/api/`

However, since you specified "don't change anything in Frontend folder", keep the current setup and update only the API URLs in service files if they exist.

---

## Phase 12: Post-Migration Checklist

- [ ] PostgreSQL installed and configured
- [ ] Database created and user permissions set
- [ ] `firebase.json`, `firestore.rules`, `firestore.indexes.json` removed from root
- [ ] `backend/firebase.json`, `backend/firestore.rules`, `backend/firestore.indexes.json` removed
- [ ] `backend/functions/` folder removed
- [ ] All JPA Entity models created
- [ ] All Spring Data Repositories created
- [ ] All Service classes created
- [ ] All DTO classes created
- [ ] REST Controllers created
- [ ] Flyway migration scripts created
- [ ] `application.yml` configured
- [ ] Backend builds successfully: `mvn clean install`
- [ ] Backend runs successfully: `mvn spring-boot:run`
- [ ] Database tables created in PostgreSQL
- [ ] API endpoints tested with Postman/curl

---

## Summary of Removed Firebase Files

```
REMOVED FROM ROOT:
✗ firebase.json
✗ firestore.rules
✗ firestore.indexes.json

REMOVED FROM BACKEND:
✗ backend/firebase.json
✗ backend/firestore.rules
✗ backend/firestore.indexes.json
✗ backend/functions/ (entire TypeScript Cloud Functions folder)

KEPT:
✓ Frontend/ (completely unchanged)
✓ backend/pom.xml (updated with Spring Boot + PostgreSQL)
✓ backend/src/main/java/ (Java Spring Boot code)
✓ backend/src/main/resources/ (application.yml and migration scripts)
```

---

## Testing the API

Once the backend is running, test endpoints:

```bash
# Create a user
curl -X POST http://localhost:8080/api/users \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password","firstName":"John","lastName":"Doe"}'

# Get user
curl http://localhost:8080/api/users/1

# Start a ride
curl -X POST http://localhost:8080/api/rides \
  -H "Content-Type: application/json" \
  -d '{"userId":1,"startLatitude":40.7128,"startLongitude":-74.0060}'
```

---

**Status**: Ready for implementation. Follow phases 1-12 in order.
