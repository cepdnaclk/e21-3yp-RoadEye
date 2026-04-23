package com.roadeye.config;

import com.roadeye.security.JwtAuthFilter;
import com.roadeye.security.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfigurationSource;

/**
 * Security configuration for RoadEye application
 *
 * Responsibilities:
 * - Define which endpoints are public
 * - Protect secured APIs
 * - Attach JWT authentication filter
 */
@RequiredArgsConstructor
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private final CorsConfigurationSource corsConfigurationSource;

    // ✅ Inject filter properly via Spring
    private final JwtAuthFilter jwtAuthFilter;

    /**
     * Main Spring Security filter chain configuration
     */
    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {

        // Create JWT filter instance
        JwtAuthFilter jwtAuthFilter = new JwtAuthFilter(jwtService);

        http
            // Enable CORS (frontend access allowed)
            .cors(cors -> cors.configurationSource(corsConfigurationSource))

            // Disable CSRF (typical for REST APIs)
            .csrf(csrf -> csrf.disable())

            // Define authorization rules
            .authorizeHttpRequests(auth -> auth

                // PUBLIC ENDPOINTS (no authentication needed)
                .requestMatchers("/api/users/login").permitAll()
                .requestMatchers("/api/users/register").permitAll()

                // 🔐 ALL OTHER ENDPOINTS REQUIRE AUTHENTICATION
                .anyRequest().authenticated()
            )

            // Add JWT filter before Spring's authentication filter
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}