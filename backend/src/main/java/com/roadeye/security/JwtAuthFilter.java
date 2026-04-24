package com.roadeye.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

/**
 * JWT Authentication Filter
 *
 * This filter runs on every request and:
 * 1. Skips public endpoints (login/register)
 * 2. Extracts JWT token from Authorization header
 * 3. Validates token
 * 4. Sets authentication in Spring Security context
 */
@Component

public class JwtAuthFilter extends OncePerRequestFilter {

    private final JwtService jwtService;

   //@Autowired
    public JwtAuthFilter(JwtService jwtService) {
        this.jwtService = jwtService;
    }

    
    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain)
            throws ServletException, IOException {

        String path = request.getRequestURI();

        // ==========================================
        // 1. SKIP PUBLIC ENDPOINTS
        // ==========================================
        if (path.equals("/api/users/login") ||
            path.equals("/api/users/register")) {

            filterChain.doFilter(request, response);
            return;
        }

        // ==========================================
        // 2. GET AUTH HEADER
        // ==========================================
        String authHeader = request.getHeader("Authorization");

        // No token → continue request (will be blocked later if needed)
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        // ==========================================
        // 3. EXTRACT TOKEN
        // ==========================================
        String token = authHeader.substring(7);

        try {

            // Extract email from token
            String email = jwtService.extractEmail(token);

            // ==========================================
            // ✅ 4. AUTHENTICATE ONLY IF NOT ALREADY AUTHENTICATED
            // ==========================================
            if (email != null &&
                SecurityContextHolder.getContext().getAuthentication() == null) {

                // Validate token
                if (jwtService.validateToken(token)) {

                    UsernamePasswordAuthenticationToken auth =
                            new UsernamePasswordAuthenticationToken(
                                    email,
                                    null,
                                    List.of() // no roles yet
                            );

                    auth.setDetails(
                            new WebAuthenticationDetailsSource().buildDetails(request)
                    );

                    // Set authentication in security context
                    SecurityContextHolder.getContext().setAuthentication(auth);
                }
            }

        } catch (Exception e) {
            System.out.println("Invalid JWT token: " + e.getMessage());
        }

        // ==========================================
        // 5. CONTINUE FILTER CHAIN
        // ==========================================
        filterChain.doFilter(request, response);
    }
}