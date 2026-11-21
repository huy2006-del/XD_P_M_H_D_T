package com.example.app.dto;

public record AuditLogEvent(String action, Long userId, String username, String details) {
}
