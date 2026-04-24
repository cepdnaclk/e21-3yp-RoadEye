package com.roadeye.config;

import java.util.Arrays;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

/**
 * Configuration for password encoding, CORS, and other beans.
 */
@Configuration
public class AppConfiguration {

    /**
     * Password encoder bean using BCrypt.
     
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    /**
     * CORS configuration.
     *
     * Using setAllowedOriginPatterns("*") instead of setAllowedOrigins(...)
     * because the wildcard pattern works correctly with allowCredentials=true
     * and also covers any physical device IP without hardcoding.
     */
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();

        // Allow any origin — covers Android emulator, iOS simulator,
        // and any physical device on your LAN without hardcoding IPs.
        configuration.setAllowedOriginPatterns(Arrays.asList("*"));

        configuration.setAllowedMethods(Arrays.asList(
            "GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"
        ));
        configuration.setAllowedOrigins(Arrays.asList(
                "http://localhost:3000",    // React frontend
                "http://localhost:8080",    // Another local endpoint
                "http://127.0.0.1:*", // Allow any port on localhost
                "http://10.30.1.169:8081"       
        ));
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"));
        configuration.setAllowedHeaders(Arrays.asList("*"));
        configuration.setAllowCredentials(true);
        configuration.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}