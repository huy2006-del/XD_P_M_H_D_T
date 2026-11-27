package com.example.app.config;

import com.example.app.service.JwtTokenProvider;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.oauth2.jwt.JwtValidationException;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class JwtCompatibilityTest {
    private final SecurityConfig security = new SecurityConfig();

    @ParameterizedTest
    @CsvSource({"32, HS256", "48, HS384", "64, HS512"})
    void issuerAndResourceServerAgreeOnHmacAlgorithmAndClaims(int keyLength, String algorithm) {
        String secret = "a".repeat(keyLength);
        String userId = UUID.randomUUID().toString();
        var issuer = new JwtTokenProvider(secret, 60_000);
        var jwt = security.jwtDecoder(secret).decode(issuer.generateToken(userId, "operator", "OPERATOR"));
        var auth = security.jwtAuthenticationConverter().convert(jwt);

        assertEquals(algorithm, jwt.getHeaders().get("alg"));
        assertEquals(userId, jwt.getClaimAsString("userId"));
        assertEquals("operator", auth.getName());
        assertEquals(List.of("ROLE_OPERATOR"), auth.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority).toList());
    }

    @Test
    void resourceServerRejectsExpiredSignedToken() {
        String secret = "b".repeat(64);
        Instant now = Instant.now();
        String token = Jwts.builder()
                .subject("operator")
                .issuedAt(Date.from(now.minusSeconds(600)))
                .expiration(Date.from(now.minusSeconds(300)))
                .signWith(Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8)))
                .compact();

        assertThrows(JwtValidationException.class, () -> security.jwtDecoder(secret).decode(token));
    }
}
