package com.freshvend.identity_service.entity;

import com.freshvend.identity_service.enums.ActionType;
import com.freshvend.identity_service.enums.EntityType;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "audit_logs")
@Getter
@Setter
@NoArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class AuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    Long id;

    @Column(name = "user_id")
    Long userId;

    String username;

    @Enumerated(EnumType.STRING)
    ActionType action;

    @Enumerated(EnumType.STRING)
    @Column(name = "entity_name")
    EntityType entityName;

    @Column(name = "entity_id")
    String entityId;

    @Column(columnDefinition = "TEXT")
    String details;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    LocalDateTime createdAt;

    public AuditLog(Long id, Long userId, String username, ActionType action, EntityType entityName, String entityId, String details, LocalDateTime createdAt) {
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
