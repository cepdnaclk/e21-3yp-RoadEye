package com.roadeye.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfigurationSource;
import lombok.RequiredArgsConstructor;

/**
 * Spring Security configuration
 * For now, we're allowing basic requests. Add JWT/OAuth2 authentication as needed.
 */
@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final CorsConfigurationSource corsConfigurationSource;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .cors(cors -> cors.configurationSource(corsConfigurationSource))
                .csrf(csrf -> csrf.disable())
                .authorizeHttpRequests(auth -> auth
                        // Public endpoints
                        .requestMatchers("/api/users/register").permitAll()
                        .requestMatchers("/api/health").permitAll()
                        // All other endpoints require authentication (add when implementing JWT)
                        .anyRequest().permitAll() // For now, allow all
                )
                .httpBasic(httpBasic -> {});

        return http.build();
    }
}
