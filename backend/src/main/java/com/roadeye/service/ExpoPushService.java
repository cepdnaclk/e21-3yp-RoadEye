package com.roadeye.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

/**
 * ExpoPushService
 *
 * Sends push notifications via Expo's free push API.
 * No Firebase, no APNs setup needed — Expo handles everything.
 *
 * Docs: https://docs.expo.dev/push-notifications/sending-notifications/
 */
@Service
@Slf4j
public class ExpoPushService {

    private static final String EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

    private final HttpClient httpClient = HttpClient.newHttpClient();

    /**
     * Send a push notification to a single Expo push token.
     *
     * @param expoPushToken  the token saved from the device (starts with "ExponentPushToken[...")
     * @param title          notification title
     * @param body           notification body text
     * @param data           optional JSON string for extra data (can be null)
     * @return               true if Expo accepted the request
     */
    public boolean sendPushNotification(String expoPushToken,
                                        String title,
                                        String body,
                                        String data) {

        if (expoPushToken == null || expoPushToken.isBlank()) {
            log.warn("[Push] No Expo push token — skipping notification");
            return false;
        }

        // Build JSON payload
        String dataField = (data != null && !data.isBlank())
                ? "\"data\": " + data + ","
                : "";

        String json = """
                {
                  "to": "%s",
                  "title": "%s",
                  "body": "%s",
                  %s
                  "sound": "default",
                  "priority": "high"
                }
                """.formatted(expoPushToken, title, body, dataField);

        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(EXPO_PUSH_URL))
                    .header("Content-Type", "application/json")
                    .header("Accept",       "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(json))
                    .build();

            HttpResponse<String> response =
                    httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() == 200) {
                log.info("[Push] Notification sent to token ending in ...{}",
                        expoPushToken.substring(Math.max(0, expoPushToken.length() - 6)));
                return true;
            } else {
                log.error("[Push] Expo API returned {}: {}", response.statusCode(), response.body());
                return false;
            }

        } catch (Exception e) {
            log.error("[Push] Failed to send notification: {}", e.getMessage());
            return false;
        }
    }
}