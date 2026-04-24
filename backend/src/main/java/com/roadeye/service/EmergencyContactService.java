package com.roadeye.service;

import com.roadeye.model.EmergencyContact;
import com.roadeye.model.User;
import com.roadeye.repository.EmergencyContactRepository;
import com.roadeye.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class EmergencyContactService {

    private final EmergencyContactRepository emergencyContactRepository;
    private final UserRepository userRepository;

    /**
     * Add a new emergency contact
     */
    public EmergencyContact addEmergencyContact(UUID userId, EmergencyContact contactData) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (contactData.getName() == null || contactData.getPhone() == null || contactData.getChannel() == null) {
            throw new IllegalArgumentException("Missing required contact fields (name, phone, channel)");
        }

        EmergencyContact contact = EmergencyContact.builder()
                .user(user)
                .name(contactData.getName())
                .phone(contactData.getPhone())
                .email(contactData.getEmail())
                .relationship(contactData.getRelationship())
                .channel(contactData.getChannel())
                .enabled(true)
                .build();

        return emergencyContactRepository.save(contact);
    }

    /**
     * Get all emergency contacts for a user
     */
    public List<EmergencyContact> getUserEmergencyContacts(UUID userId) {
        return emergencyContactRepository.findByUserId(userId);
    }

    /**
     * Get enabled emergency contacts only
     */
    public List<EmergencyContact> getEnabledEmergencyContacts(UUID userId) {
        return emergencyContactRepository.findByUserIdAndEnabled(userId, true);
    }

    /**
     * Update an emergency contact
     */
    public EmergencyContact updateEmergencyContact(Long contactId, EmergencyContact contactData) {
        EmergencyContact contact = emergencyContactRepository.findById(contactId)
                .orElseThrow(() -> new RuntimeException("Contact not found"));

        if (contactData.getName() != null)
            contact.setName(contactData.getName());
        if (contactData.getPhone() != null)
            contact.setPhone(contactData.getPhone());
        if (contactData.getEmail() != null)
            contact.setEmail(contactData.getEmail());
        if (contactData.getRelationship() != null)
            contact.setRelationship(contactData.getRelationship());
        if (contactData.getChannel() != null)
            contact.setChannel(contactData.getChannel());
        if (contactData.getEnabled() != null)
            contact.setEnabled(contactData.getEnabled());

        return emergencyContactRepository.save(contact);
    }

    /**
     * Delete an emergency contact
     */
    public void deleteEmergencyContact(Long contactId) {
        emergencyContactRepository.deleteById(contactId);
    }

    /**
     * Toggle emergency contact enabled status
     */
    public EmergencyContact toggleContact(Long contactId) {
        EmergencyContact contact = emergencyContactRepository.findById(contactId)
                .orElseThrow(() -> new RuntimeException("Contact not found"));

        contact.setEnabled(!contact.getEnabled());
        return emergencyContactRepository.save(contact);
    }
}
