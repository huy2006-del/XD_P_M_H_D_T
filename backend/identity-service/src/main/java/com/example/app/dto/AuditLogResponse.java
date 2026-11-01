package com.example.app.dto;

import com.example.app.entity.AuditAction;
import lombok.*;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuditLogResponse {
    private Long id;
    private AuditAction action;
    private Long userId;
    private String username;
    private String details;
    private LocalDateTime createdAt;
}