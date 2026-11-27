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
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.oauth2.server.resource.authentication.JwtGrantedAuthoritiesConverter;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
public class SecurityConfig {

    @Bean
    public SecurityFilterChain securityFilterChain(
            HttpSecurity http) throws Exception {

        return http
                .csrf(AbstractHttpConfigurer::disable)

                .sessionManagement(session -> session
                        .sessionCreationPolicy(
                                SessionCreationPolicy.STATELESS))

                .authorizeHttpRequests(authorize -> authorize

                        .requestMatchers("/api/v1/auth/**")
                        .permitAll()

                        .requestMatchers(
                                HttpMethod.POST,
                                "/api/v1/restock-sessions/**")
                        .hasAnyRole("OPERATOR", "ADMIN")

                        .requestMatchers(
                                HttpMethod.PATCH,
                                "/api/v1/alerts/**")
                        .hasAnyRole("OPERATOR", "ADMIN")

                        .requestMatchers(
                                HttpMethod.PUT,
                                "/api/v1/machines/*/thresholds")
                        .hasRole("ADMIN")

                        .requestMatchers(
                                HttpMethod.PATCH,
                                "/api/v1/machines/*/thresholds")
                        .hasRole("ADMIN")

                        .requestMatchers(
                                HttpMethod.GET,
                                "/api/v1/audit-logs/**")
                        .hasRole("ADMIN")

                        .requestMatchers(
                                HttpMethod.POST,
                                "/api/v1/audit-logs")
                        .hasAnyRole("ADMIN", "OPERATOR")

                        .anyRequest()
                        .authenticated()
                )

                .oauth2ResourceServer(oauth -> oauth
                        .jwt(jwt -> jwt
                                .jwtAuthenticationConverter(
                                        jwtAuthenticationConverter())))

                .build();
    }

    @Bean
    public JwtDecoder jwtDecoder(
            @Value("${jwt.secret:freshvend-super-secret-key-must-be-at-least-256-bits-long-for-hmac-sha256}") String secret) {

        byte[] keyBytes =
                secret.getBytes(StandardCharsets.UTF_8);

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

        SecretKeySpec key =
                new SecretKeySpec(keyBytes, keyAlgorithm);

        return NimbusJwtDecoder
                .withSecretKey(key)
                .macAlgorithm(algorithm)
                .build();
    }

    @Bean
    public JwtAuthenticationConverter
            jwtAuthenticationConverter() {

        JwtGrantedAuthoritiesConverter authorities =
                new JwtGrantedAuthoritiesConverter();

        authorities.setAuthoritiesClaimName("role");
        authorities.setAuthorityPrefix("ROLE_");

        JwtAuthenticationConverter converter =
                new JwtAuthenticationConverter();

        converter.setJwtGrantedAuthoritiesConverter(
                authorities);

        return converter;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}