package com.example.app.dto;

import com.example.app.entity.AuditAction;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuditLogRequest {
    @NotNull(message = "Action is required")
    private AuditAction action;

    private Long userId;

    @NotBlank(message = "Username is required")
    private String username;

    private String details;
}