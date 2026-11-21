package com.example.app.service;

import com.example.app.dto.event.AuditLogEvent;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

public final class AuditLogSupport {

    private static final String DEFAULT_USERNAME = "operator_admin";

    private AuditLogSupport() {
    }

    public static AuditLogEvent event(String action, String details, String usernameOverride) {
        String username = usernameOverride;
        if (username == null || username.isBlank()) {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            if (authentication != null && authentication.isAuthenticated()
                    && authentication.getName() != null
                    && !authentication.getName().isBlank()
                    && !"anonymousUser".equals(authentication.getName())) {
                username = authentication.getName();
            } else {
                username = DEFAULT_USERNAME;
            }
        }
        return new AuditLogEvent(action, null, username, details);
    }
}
