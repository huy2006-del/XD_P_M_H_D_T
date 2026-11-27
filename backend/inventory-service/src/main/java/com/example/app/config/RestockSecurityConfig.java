package com.example.app.config;

import java.nio.charset.StandardCharsets;
import javax.crypto.spec.SecretKeySpec;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.oauth2.server.resource.authentication.JwtGrantedAuthoritiesConverter;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
public class RestockSecurityConfig {

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        return http
                .csrf(AbstractHttpConfigurer::disable)
                .formLogin(AbstractHttpConfigurer::disable)
                .httpBasic(AbstractHttpConfigurer::disable)
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(authorize -> authorize
                        // Internal service-to-service endpoints & static product images
                        .requestMatchers("/internal/**", "/uploads/products/**").permitAll()
                        // Public read access for Kiosk & Machine Slot Product lookup
                        .requestMatchers(HttpMethod.GET, "/api/v1/products", "/api/v1/products/**").permitAll()
                        // Public Kiosk Order creation, polling & payment webhook
                        .requestMatchers(HttpMethod.POST, "/api/v1/orders", "/api/v1/payments/webhook").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/v1/orders/*", "/api/v1/orders/code/*").permitAll()
                        // Slot inventory & dispense operations
                        .requestMatchers(HttpMethod.GET, "/api/v1/slots/**").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/v1/slots/*/dispense").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/v1/slots/*/batches").hasAnyRole("OPERATOR", "ADMIN")
                        // Restock sessions: OPERATOR and ADMIN
                        .requestMatchers("/api/v1/restock-sessions", "/api/v1/restock-sessions/**").hasAnyRole("OPERATOR", "ADMIN")
                        // Batches & Spoilage Report: OPERATOR and ADMIN
                        .requestMatchers("/api/v1/batches", "/api/v1/batches/**").hasAnyRole("OPERATOR", "ADMIN")
                        .requestMatchers(HttpMethod.GET, "/api/v1/reports/spoilage").hasAnyRole("OPERATOR", "ADMIN")
                        // Admin-only endpoints: product management, order listing, analytics & CSV export
                        .requestMatchers(HttpMethod.POST, "/api/v1/products/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.PUT, "/api/v1/products/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.PATCH, "/api/v1/products/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.DELETE, "/api/v1/products/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.GET, "/api/v1/orders").hasRole("ADMIN")
                        .requestMatchers("/api/v1/analytics/**", "/api/v1/reports/export-csv").hasRole("ADMIN")
                        .anyRequest().authenticated()
                )
                .oauth2ResourceServer(oauth -> oauth
                        .jwt(jwt -> jwt.jwtAuthenticationConverter(jwtAuthenticationConverter())))
                .build();
    }

    @Bean
    public JwtDecoder jwtDecoder(
            @Value("${jwt.secret:freshvend-super-secret-key-must-be-at-least-256-bits-long-for-hmac-sha256}") String secret) {
        byte[] keyBytes = secret.getBytes(StandardCharsets.UTF_8);
        MacAlgorithm algorithm;
        String keyAlgorithm;

        if (keyBytes.length >= 64) {
            algorithm = MacAlgorithm.HS512;
            keyAlgorithm = "HmacSHA512";
        } else if (keyBytes.length >= 48) {
            algorithm = MacAlgorithm.HS384;
            keyAlgorithm = "HmacSHA384";
        } else {
            algorithm = MacAlgorithm.HS256;
            keyAlgorithm = "HmacSHA256";
        }

        SecretKeySpec key = new SecretKeySpec(keyBytes, keyAlgorithm);
        return NimbusJwtDecoder.withSecretKey(key).macAlgorithm(algorithm).build();
    }

    @Bean
    public JwtAuthenticationConverter jwtAuthenticationConverter() {
        JwtGrantedAuthoritiesConverter authorities = new JwtGrantedAuthoritiesConverter();
        authorities.setAuthoritiesClaimName("role");
        authorities.setAuthorityPrefix("ROLE_");

        JwtAuthenticationConverter converter = new JwtAuthenticationConverter();
        converter.setJwtGrantedAuthoritiesConverter(authorities);
        return converter;
    }
}
