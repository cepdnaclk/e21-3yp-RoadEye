package com.roadeye.service;

import com.roadeye.model.TiltEvent;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

/**
 * EmergencyAlertService
 *
 * SMS is handled entirely on the mobile device via React Native's
 * Linking.openURL (native SMS). No backend messaging needed.
 * This class is kept as a placeholder for future channels if needed.
 */
@Service
@Slf4j
public class EmergencyAlertService {

    public void sendAlertsForUser(TiltEvent tiltEvent,
                                  String riderName,
                                  String customMessage) {
        log.info("[Alert] Tilt event {} recorded for {}. SMS handled on-device.",
                tiltEvent.getId(), riderName);
    }
}