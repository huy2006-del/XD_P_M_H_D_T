package com.freshvend.identity_service.dto;

import com.freshvend.identity_service.enums.ActionType;
import com.freshvend.identity_service.enums.EntityType;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
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

    public AuditLogResponse(Long id, Long userId, String username, ActionType action, EntityType entityName, String entityId, String details, LocalDateTime createdAt) {
        this.id = id;
        this.userId = userId;
        this.username = username;
        this.action = action;
        this.entityName = entityName;
        this.entityId = entityId;
        this.details = details;
        this.createdAt = createdAt;
    }
}
