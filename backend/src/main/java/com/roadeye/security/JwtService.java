package com.roadeye.security;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Service;

import java.security.Key;
import java.util.Date;

/**
 * JwtService
 * ----------
 * Responsible for:
 * 1. Generating JWT tokens
 * 2. Extracting email (subject) from token
 * 3. Validating tokens
 */
@Service
public class JwtService {

    /**
     * Secret key used for signing JWT tokens.
     * ⚠ In production, store this in environment variables or config file.
     */
    private static final String SECRET_KEY =
            "my-secret-key-roadeye-my-secret-key-roadeye-123456";

    /**
     * Convert secret key into cryptographic signing key
     */
    private Key getSignKey() {
        byte[] keyBytes = Decoders.BASE64.decode(
                java.util.Base64.getEncoder().encodeToString(SECRET_KEY.getBytes())
        );
        return Keys.hmacShaKeyFor(keyBytes);
    }

    /**
     * Generate JWT token using user's email
     */
    public String generateToken(String email) {
        return Jwts.builder()
                .setSubject(email) // store email as subject
                .setIssuedAt(new Date()) // token creation time
                .setExpiration(new Date(System.currentTimeMillis() + 86400000)) // 1 day validity
                .signWith(getSignKey(), SignatureAlgorithm.HS256) // signing algorithm
                .compact();
    }

    /**
     * Extract email (subject) from JWT token
     */
    public String extractEmail(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(getSignKey())
                .build()
                .parseClaimsJws(token)
                .getBody()
                .getSubject();
    }

    /**
     * Validate token (checks signature + expiration)
     */
    public boolean validateToken(String token) {
        try {
            Jwts.parserBuilder()
                    .setSigningKey(getSignKey())
                    .build()
                    .parseClaimsJws(token);

            return true;
        } catch (Exception e) {
            return false; // invalid or expired token
        }
    }
}