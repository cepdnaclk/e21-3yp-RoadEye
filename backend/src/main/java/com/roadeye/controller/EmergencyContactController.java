package com.roadeye.controller;

import com.roadeye.model.EmergencyContact;
import com.roadeye.service.EmergencyContactService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/emergency-contacts")
@RequiredArgsConstructor
public class EmergencyContactController {

    private final EmergencyContactService emergencyContactService;

    /**
     * POST /api/emergency-contacts - Add a new emergency contact
     */
    @PostMapping
    public ResponseEntity<?> addEmergencyContact(
            @RequestParam Long userId,
            @RequestBody AddEmergencyContactRequest request) {
        try {
            EmergencyContact contact = EmergencyContact.builder()
                    .name(request.getName())
                    .phone(request.getPhone())
                    .email(request.getEmail())
                    .relationship(request.getRelationship())
                    .channel(EmergencyContact.ContactChannel.valueOf(request.getChannel().toUpperCase()))
                    .build();

            EmergencyContact savedContact = emergencyContactService.addEmergencyContact(userId, contact);
            return ResponseEntity.status(HttpStatus.CREATED).body(toDTO(savedContact));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body("Invalid contact data: " + e.getMessage());
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(e.getMessage());
        }
    }

    /**
     * GET /api/emergency-contacts/user/{userId} - Get all emergency contacts
     */
    @GetMapping("/user/{userId}")
    public ResponseEntity<?> getUserEmergencyContacts(@PathVariable Long userId) {
        List<EmergencyContact> contacts = emergencyContactService.getUserEmergencyContacts(userId);
        List<EmergencyContactDTO> contactDTOs = contacts.stream().map(this::toDTO).collect(Collectors.toList());
        return ResponseEntity.ok(contactDTOs);
    }

    /**
     * GET /api/emergency-contacts/user/{userId}/enabled - Get enabled contacts only
     */
    @GetMapping("/user/{userId}/enabled")
    public ResponseEntity<?> getEnabledEmergencyContacts(@PathVariable Long userId) {
        List<EmergencyContact> contacts = emergencyContactService.getEnabledEmergencyContacts(userId);
        List<EmergencyContactDTO> contactDTOs = contacts.stream().map(this::toDTO).collect(Collectors.toList());
        return ResponseEntity.ok(contactDTOs);
    }

    /**
     * PUT /api/emergency-contacts/{contactId} - Update emergency contact
     */
    @PutMapping("/{contactId}")
    public ResponseEntity<?> updateEmergencyContact(
            @PathVariable Long contactId,
            @RequestBody UpdateEmergencyContactRequest request) {
        try {
            EmergencyContact contact = EmergencyContact.builder()
                    .name(request.getName())
                    .phone(request.getPhone())
                    .email(request.getEmail())
                    .relationship(request.getRelationship())
                    .channel(request.getChannel() != null ? 
                            EmergencyContact.ContactChannel.valueOf(request.getChannel().toUpperCase()) : null)
                    .enabled(request.getEnabled())
                    .build();

            EmergencyContact updated = emergencyContactService.updateEmergencyContact(contactId, contact);
            return ResponseEntity.ok(toDTO(updated));
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * DELETE /api/emergency-contacts/{contactId} - Delete emergency contact
     */
    @DeleteMapping("/{contactId}")
    public ResponseEntity<?> deleteEmergencyContact(@PathVariable Long contactId) {
        try {
            emergencyContactService.deleteEmergencyContact(contactId);
            return ResponseEntity.ok("Contact deleted successfully");
        } catch (Exception e) {
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * PATCH /api/emergency-contacts/{contactId}/toggle - Toggle contact enabled status
     */
    @PatchMapping("/{contactId}/toggle")
    public ResponseEntity<?> toggleContact(@PathVariable Long contactId) {
        try {
            EmergencyContact contact = emergencyContactService.toggleContact(contactId);
            return ResponseEntity.ok(toDTO(contact));
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    private EmergencyContactDTO toDTO(EmergencyContact contact) {
        return EmergencyContactDTO.builder()
                .id(contact.getId())
                .userId(contact.getUser().getId())
                .name(contact.getName())
                .phone(contact.getPhone())
                .email(contact.getEmail())
                .relationship(contact.getRelationship())
                .channel(contact.getChannel().name())
                .enabled(contact.getEnabled())
                .build();
    }

    // DTOs
    @lombok.Data
    @lombok.AllArgsConstructor
    @lombok.NoArgsConstructor
    public static class AddEmergencyContactRequest {
        private String name;
        private String phone;
        private String email;
        private String relationship;
        private String channel; // SMS, EMAIL, BOTH
    }

    @lombok.Data
    @lombok.AllArgsConstructor
    @lombok.NoArgsConstructor
    public static class UpdateEmergencyContactRequest {
        private String name;
        private String phone;
        private String email;
        private String relationship;
        private String channel;
        private Boolean enabled;
    }

    @lombok.Data
    @lombok.Builder
    public static class EmergencyContactDTO {
        private Long id;
        private Long userId;
        private String name;
        private String phone;
        private String email;
        private String relationship;
        private String channel;
        private Boolean enabled;
    }
}
