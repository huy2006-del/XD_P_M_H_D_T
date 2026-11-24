package com.example.app.service;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

@Component
public class JwtTokenProvider {

    private final SecretKey key;
    private final long expirationMs;

    public JwtTokenProvider(
            @Value("${jwt.secret:FreshVendSuperSecretKeyForJWTSignatureVerification2026MustBe256Bits!}") String secret,
            @Value("${jwt.expiration:86400000}") long expirationMs) {
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.expirationMs = expirationMs;
    }

    // 1. Tạo Token cho User (ADMIN / OPERATOR) - Đầy đủ claims: userId, username, role
    public String generateToken(String userId, String username, String role) {
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + expirationMs);

        return Jwts.builder()
                .subject(userId)
                .claim("userId", userId)
                .claim("username", username)
                .claim("role", role)
                .issuedAt(now)
                .expiration(expiryDate)
                .signWith(key)
                .compact();
    }

    // 2. Tạo Token định danh cho thiết bị tại máy bán hàng (ROLE: MACHINE)
    public String generateMachineToken(String machineId, String machineCode) {
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + (expirationMs * 30)); // 30 ngày cho thiết bị

        return Jwts.builder()
                .subject(machineId)
                .claim("userId", machineId)
                .claim("username", machineCode)
                .claim("role", "MACHINE")
                .issuedAt(now)
                .expiration(expiryDate)
                .signWith(key)
                .compact();
    }

    // 3. Giải mã và kiểm tra chữ ký + hạn token (Ném rõ ExpiredJwtException nếu hết hạn)
    public Claims getClaimsFromToken(String token) {
        return Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    // 4. Kiểm tra token hợp lệ (Giữ nguyên tương thích với code cũ)
    public boolean validateToken(String token) {
        try {
            Jwts.parser().verifyWith(key).build().parseSignedClaims(token);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }

    // 5. Kiểm tra riêng trạng thái hết hạn của token
    public boolean isTokenExpired(String token) {
        try {
            getClaimsFromToken(token);
            return false;
        } catch (ExpiredJwtException e) {
            return true;
        } catch (Exception e) {
            return false;
        }
    }
}