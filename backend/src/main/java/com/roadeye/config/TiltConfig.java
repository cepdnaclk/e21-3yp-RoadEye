package com.roadeye.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * TiltConfig
 *
 * Holds the tilt threshold value.
 * Currently hardcoded to 45.0 degrees — replace with dynamic DB value later.
 *
 * To make this dynamic later:
 * - Add a UserSettings entity with a tiltThreshold column
 * - Inject that value per user instead of this global config
 */
@Component
@ConfigurationProperties(prefix = "roadeye.tilt")
@Getter
@Setter
public class TiltConfig {

    /**
     * Angle in degrees at which an emergency is considered triggered.
     * 45 degrees = bike is severely leaning / has fallen.
     * This is a placeholder — replace with sensor-calibrated value.
     */
    private Double threshold = 45.0;

    /**
     * Cooldown in seconds between alerts for the same user.
     * Prevents alert storms if the sensor keeps firing.
     */
    private Long cooldownSeconds = 300L; // 5 minutes
}
