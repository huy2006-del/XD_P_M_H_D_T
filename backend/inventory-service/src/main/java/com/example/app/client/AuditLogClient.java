package com.example.app.client;

import com.example.app.dto.AuditLogEvent;
import feign.RequestInterceptor;
import org.springframework.context.annotation.Bean;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.http.HttpHeaders;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

@FeignClient(name = "identity-service", configuration = AuditLogClient.AuthenticationConfig.class)
public interface AuditLogClient {

    @PostMapping("/api/v1/audit-logs")
    void recordAuditLog(@RequestBody AuditLogEvent request);

    class AuthenticationConfig {
        @Bean
        RequestInterceptor auditBearerToken() {
            return request -> {
                if (SecurityContextHolder.getContext().getAuthentication() instanceof JwtAuthenticationToken jwt) {
                    request.header(HttpHeaders.AUTHORIZATION, "Bearer " + jwt.getToken().getTokenValue());
                }
            };
        }
    }
}
