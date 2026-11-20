package com.example.app.dto.event;

public record AuditLogEvent(String action, Long userId, String username, String details) {
}
