package com.example.app.entity;

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
@AllArgsConstructor
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
}