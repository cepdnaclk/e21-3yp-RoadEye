package com.roadeye.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
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

    // Secret key (change this in production!)
    private final String SECRET_KEY = "my-secret-key-roadeye-secret-key-min-256-bits-long";
    private final SecretKey key = Keys.hmacShaKeyFor(SECRET_KEY.getBytes());

    /**
     * Generate JWT token using user's email
     */
    public String generateToken(String email) {
        return Jwts.builder()
                .setSubject(email) // who the token belongs to
                .setIssuedAt(new Date()) // current time
                .setExpiration(new Date(System.currentTimeMillis() + 86400000)) // expires in 1 day
                .signWith(key, SignatureAlgorithm.HS256)
                .compact();
    }

    /**
     * Extract email (subject) from JWT token
     */
    public String extractEmail(String token) {
        return getClaims(token).getSubject();
    }

    /**
     * Validate JWT token
     */
    public boolean validateToken(String token) {
        try {
           /*Jwts.parser()
                    .verifyWith(key)
                    .build()
                    .parseSignedClaims(token);
            return true;
        } catch (Exception e) {
            return false;
        }
    } */
            getClaims(token);
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    /**
     * Get claims from token
     */
    private Claims getClaims(String token) {
        return Jwts.parserBuilder()
        //return Jwts.parser()
                .setSigningKey(key)
                //.verifyWith(key)
                .build()
                .parseClaimsJws(token)
                .getBody();
                //.parseSignedClaims(token)
                //.getPayload();
    }
    
    /**
     * Validate token (checks signature + expiration)
    
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
 */
}