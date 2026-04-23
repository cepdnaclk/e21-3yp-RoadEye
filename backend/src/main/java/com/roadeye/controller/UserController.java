package com.roadeye.controller;

import com.roadeye.model.User;
import com.roadeye.service.UserService;
import com.roadeye.security.JwtService; 
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder; 
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    //Inject password encoder
    private final PasswordEncoder passwordEncoder;

    //Inject JWT utility
    private final JwtService jwtService;

    /**
     * REGISTER USER
     */
    @PostMapping("/register")
    public ResponseEntity<?> registerUser(@RequestBody RegistrationRequest request) {
        try {
            User user = userService.registerUser(
                    request.getEmail(),
                    request.getPassword(),
                    request.getFirstName(),
                    request.getLastName()
            );
            return ResponseEntity.status(HttpStatus.CREATED).body(toDTO(user));
        } catch (IllegalArgumentException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
        }
    }

    /**
     * LOGIN USER (JWT AUTH)
     */
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request) {
        try {
            // 1. Find user by email
            User user = userService.findByEmail(request.getEmail())
                    .orElseThrow(() -> new RuntimeException("User not found"));

            // 2. Check password
            if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "Invalid password"));
            }

            // 3. Generate JWT token
            String token = jwtService.generateToken(user.getEmail());

            // 4. Return token
            return ResponseEntity.ok(Map.of(
                    "token", token,
                    "user", toDTO(user)
            ));

        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * GET USER PROFILE
     */
    @GetMapping("/{userId}")
    public ResponseEntity<?> getUserProfile(@PathVariable Long userId) {
        return userService.findById(userId)
                .map(user -> ResponseEntity.ok(toDTO(user)))
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * UPDATE USER PROFILE
     */
    @PutMapping("/{userId}")
    public ResponseEntity<?> updateProfile(
            @PathVariable Long userId,
            @RequestBody UpdateProfileRequest request) {
        try {
            User user = userService.updateProfile(
                    userId,
                    request.getFirstName(),
                    request.getLastName(),
                    request.getPhoneNumber()
            );
            return ResponseEntity.ok(toDTO(user));
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * DELETE (DEACTIVATE) USER
     */
    @DeleteMapping("/{userId}")
    public ResponseEntity<?> deactivateUser(@PathVariable Long userId) {
        try {
            userService.deactivateUser(userId);
            return ResponseEntity.ok(Map.of("message", "User deactivated successfully"));
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * Convert Entity → DTO
     */
    private UserDTO toDTO(User user) {
        return UserDTO.builder()
                .id(user.getId())
                .email(user.getEmail())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .phoneNumber(user.getPhoneNumber())
                .active(user.getActive())
                .createdAt(user.getCreatedAt().toString())
                .build();
    }

    // ================= DTO CLASSES =================

    /**
     * REGISTER REQUEST
     */
    @lombok.Data
    @lombok.AllArgsConstructor
    @lombok.NoArgsConstructor
    public static class RegistrationRequest {
        private String email;
        private String password;
        private String firstName;
        private String lastName;
    }

    /**
     * ✅ NEW: LOGIN REQUEST
     */
    @lombok.Data
    public static class LoginRequest {
        private String email;
        private String password;
    }

    /**
     * UPDATE PROFILE REQUEST
     */
    @lombok.Data
    @lombok.AllArgsConstructor
    @lombok.NoArgsConstructor
    public static class UpdateProfileRequest {
        private String firstName;
        private String lastName;
        private String phoneNumber;
    }

    /**
     * RESPONSE DTO
     */
    @lombok.Data
    @lombok.Builder
    public static class UserDTO {
        private Long id;
        private String email;
        private String firstName;
        private String lastName;
        private String phoneNumber;
        private Boolean active;
        private String createdAt;
    }
}