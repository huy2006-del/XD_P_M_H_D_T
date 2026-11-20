package com.example.app.dto.response;

import java.time.LocalDateTime;

public record AlertDetailDTO(
        Long alertId,
        String alertType,
        String message,
        LocalDateTime createdAt,
        LocalDateTime resolvedAt,
        long durationMinutes
) {
}
