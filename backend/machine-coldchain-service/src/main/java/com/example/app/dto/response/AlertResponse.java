package com.example.app.dto.response;

import com.example.app.entity.Alert;

import java.time.LocalDateTime;

public record AlertResponse(
        Long id,
        Long machineId,
        String alertType,
        String severity,
        String message,
        String status,
        LocalDateTime createdAt,
        LocalDateTime resolvedAt,
        String resolvedBy,
        String resolutionNote
) {
    public static AlertResponse from(Alert alert) {
        return new AlertResponse(
                alert.getId(),
                alert.getMachineId(),
                alert.getAlertType().name(),
                alert.getSeverity().name(),
                alert.getMessage(),
                alert.getStatus().name(),
                alert.getCreatedAt(),
                alert.getResolvedAt(),
                alert.getResolvedBy(),
                alert.getResolutionNote()
        );
    }
}
