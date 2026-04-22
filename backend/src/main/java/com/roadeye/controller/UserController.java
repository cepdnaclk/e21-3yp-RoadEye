package com.roadeye.controller;

import com.roadeye.model.User;
import com.roadeye.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    /**
     * POST /api/users/register - Register a new user
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
     * GET /api/users/{userId} - Get user profile
     */
    @GetMapping("/{userId}")
    public ResponseEntity<?> getUserProfile(@PathVariable Long userId) {
        return userService.findById(userId)
                .map(user -> ResponseEntity.ok(toDTO(user)))
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * PUT /api/users/{userId} - Update user profile
     */
    @PutMapping("/{userId}")
    public ResponseEntity<?> updateProfile(
            @PathVariable Long userId,
            @RequestBody UpdateProfileRequest request) {
        try {
            User user = userService.updateProfile(userId, request.getFirstName(), request.getLastName(), request.getPhoneNumber());
            return ResponseEntity.ok(toDTO(user));
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * DELETE /api/users/{userId} - Deactivate user
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

    // DTOs
    @lombok.Data
    @lombok.AllArgsConstructor
    @lombok.NoArgsConstructor
    public static class RegistrationRequest {
        private String email;
        private String password;
        private String firstName;
        private String lastName;
    }

    @lombok.Data
    @lombok.AllArgsConstructor
    @lombok.NoArgsConstructor
    public static class UpdateProfileRequest {
        private String firstName;
        private String lastName;
        private String phoneNumber;
    }

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
