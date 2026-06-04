package com.roadeye.service;

import com.roadeye.model.CrashEvent;
import com.roadeye.model.TiltEvent;
import com.roadeye.model.User;
import com.roadeye.repository.CrashEventRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Service
@Slf4j
@RequiredArgsConstructor
public class EmergencyAlertService {

    private final ExpoPushService expoPushService;
    private final CrashEventRepository crashEventRepository;

    /** Existing — tilt alert (SMS handled on-device) */
    public void sendAlertsForUser(TiltEvent tiltEvent,
                                  String riderName,
                                  String customMessage) {
        log.info("[Alert] Tilt event {} recorded for {}. SMS handled on-device.",
                tiltEvent.getId(), riderName);
    }

    /**
     * Send a push notification for an accident detected via
     * acceleration + tilt thresholds.
     *
     * @param crashEvent the saved CrashEvent
     * @param user       the rider — must have expoPushToken set
     */
    public void sendAccidentAlert(CrashEvent crashEvent, User user) {
        String token = user.getExpoPushToken();  // see note below

        if (token == null || token.isBlank()) {
            log.warn("[Alert] No Expo push token for userId={} — skipping push",
                    user.getId());
            return;
        }

        String dataPayload = String.format(
                "{\"type\":\"accident\",\"crashEventId\":\"%s\"}",
                crashEvent.getId()
        );

        boolean sent = expoPushService.sendPushNotification(
                token,
                "⚠️ Accident Detected",
                "High acceleration + tilt detected. Check status.",
                dataPayload
        );

        if (sent) {
            crashEvent.setAlertsSent(true);
            crashEventRepository.save(crashEvent);
            log.info("[Alert] Accident push sent for crashId={}", crashEvent.getId());
        } else {
            log.error("[Alert] Push failed for crashId={}", crashEvent.getId());
        }
    }
}