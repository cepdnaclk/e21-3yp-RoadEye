package com.roadeye.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import lombok.RequiredArgsConstructor;

import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

/**
 * Filter that checks JWT token on every request
 */
@RequiredArgsConstructor
public class JwtAuthFilter extends OncePerRequestFilter {

    private final JwtService jwtService;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain)
            throws ServletException, IOException {

        String authHeader = request.getHeader("Authorization");

        // If no token → continue request
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        // Extract token
        String token = authHeader.substring(7);

        try {
            // Extract email from token
            String email = jwtService.extractEmail(token);

            // Only authenticate if not already authenticated
            if (email != null && SecurityContextHolder.getContext().getAuthentication() == null) {

                // Validate token
                if (jwtService.validateToken(token)) {

                    UsernamePasswordAuthenticationToken auth =
                            new UsernamePasswordAuthenticationToken(email, null, List.of());

                    auth.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));

                    // Set authentication in Spring Security
                    SecurityContextHolder.getContext().setAuthentication(auth);
                }
            }

        } catch (Exception e) {
            System.out.println("Invalid JWT token: " + e.getMessage());
        }

        // Continue request
        filterChain.doFilter(request, response);
    }
}