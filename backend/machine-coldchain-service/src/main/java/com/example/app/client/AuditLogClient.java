package com.example.app.client;

import com.example.app.dto.event.AuditLogEvent;
import feign.RequestInterceptor;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.context.annotation.Bean;
import org.springframework.http.HttpHeaders;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

@FeignClient(name = "identity-service", configuration = AuditLogClient.AuthenticationConfig.class)
public interface AuditLogClient {

    @PostMapping("/api/v1/audit-logs")
    void recordAuditLog(@RequestBody AuditLogEvent request);

    class AuthenticationConfig {
        @Bean
        RequestInterceptor auditBearerToken() {
            return request -> {
                if (RequestContextHolder.getRequestAttributes() instanceof ServletRequestAttributes attrs) {
                    HttpServletRequest servletRequest = attrs.getRequest();
                    String authorization = servletRequest.getHeader(HttpHeaders.AUTHORIZATION);
                    if (authorization != null && !authorization.isBlank()) {
                        request.header(HttpHeaders.AUTHORIZATION, authorization);
                    }
                }
            };
        }
    }
}
