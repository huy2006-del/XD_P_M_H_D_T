package com.example.app.dto;

import com.example.app.entity.ActionType;
import com.example.app.entity.EntityType;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class AuditLogResponse {
    Long id;
    Long userId;
    String username;
    ActionType action;
    EntityType entityName;
    String entityId;
    String details;
    LocalDateTime createdAt;
}