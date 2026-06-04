package com.roadeye.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Data
@Component
@ConfigurationProperties(prefix = "roadeye.acceleration")
public class AccelerationConfig {
    private Double threshold = 15.0;
    private Double severityMultiplier = 6.67; // 100 / 15
}
