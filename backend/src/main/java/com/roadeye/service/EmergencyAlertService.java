package com.roadeye.service;

import com.roadeye.model.*;
import com.roadeye.repository.EmergencyAlertRepository;
import com.roadeye.repository.EmergencyContactRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class EmergencyAlertService {

    private final EmergencyContactRepository emergencyContactRepository;
    private final EmergencyAlertRepository emergencyAlertRepository;
    private final SmsService smsService;

    public void sendAlertsForUser(TiltEvent tiltEvent, String riderName, String customMessage) {

        UUID userId = tiltEvent.getUser().getId();

        List<EmergencyContact> contacts =
                emergencyContactRepository.findByUserIdAndEnabled(userId, true);

        if (contacts.isEmpty()) {
            log.warn("No emergency contacts found for user {}", userId);
            return;
        }

        String messageBody = buildMessage(riderName, tiltEvent, customMessage);

        for (EmergencyContact contact : contacts) {

            // Only send SMS (ignore EMAIL channel)
            if (contact.getChannel() == EmergencyContact.ContactChannel.SMS ||
                contact.getChannel() == EmergencyContact.ContactChannel.BOTH) {

                String sid = null;
                String error = null;

                if (contact.getPhone() != null && !contact.getPhone().isBlank()) {
                    sid = smsService.sendSms(contact.getPhone(), messageBody);
                    if (sid == null) error = "SMS send failed";
                } else {
                    error = "No phone number";
                }

                EmergencyAlert alert = EmergencyAlert.builder()
                        .tiltEvent(tiltEvent)
                        .emergencyContact(contact)
                        .channel(EmergencyContact.ContactChannel.SMS)
                        .success(sid != null)
                        .errorMessage(error)
                        .externalMessageId(sid)
                        .build();

                emergencyAlertRepository.save(alert);
            }
        }
    }

    private String buildMessage(String riderName, TiltEvent event, String customMessage) {

        if (customMessage != null && !customMessage.isBlank()) {
            return customMessage;
        }

        StringBuilder sb = new StringBuilder();
        sb.append("🚨 EMERGENCY ALERT!\n\n");
        sb.append(riderName).append(" may have fallen.\n");
        sb.append("Tilt: ").append(event.getTiltAngle()).append("°\n");

        if (event.getLatitude() != null && event.getLongitude() != null) {
            sb.append("Location: https://maps.google.com/?q=")
              .append(event.getLatitude()).append(",")
              .append(event.getLongitude());
        }

        return sb.toString();
    }
}