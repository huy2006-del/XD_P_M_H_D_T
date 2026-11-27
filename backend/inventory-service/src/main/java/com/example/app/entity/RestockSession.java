package com.example.app.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "restock_sessions", uniqueConstraints = {
        @UniqueConstraint(name = "uk_restock_session_owner_request", columnNames = {"operator_id", "request_id"})
}, indexes = {
        @Index(name = "idx_restock_sessions_machine", columnList = "machine_id, started_at")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RestockSession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "session_code", nullable = false, unique = true, length = 40)
    private String sessionCode;

    @Column(name = "machine_id", nullable = false)
    private Long machineId;

    @Column(name = "operator_id", nullable = false)
    private UUID operatorId;

    @Column(name = "request_id")
    private UUID requestId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private RestockSessionStatus status;

    @Column(name = "started_at", nullable = false, updatable = false)
    private LocalDateTime startedAt;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @Column(length = 1000)
    private String notes;

    @OneToMany(mappedBy = "session", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<RestockItem> items = new ArrayList<>();

    @PrePersist
    protected void onCreate() {
        if (this.startedAt == null) {
            this.startedAt = LocalDateTime.now().truncatedTo(ChronoUnit.MICROS);
        }
        if (this.status == null) {
            this.status = RestockSessionStatus.IN_PROGRESS;
        }
    }

    public void addItem(RestockItem item) {
        items.add(item);
        item.setSession(this);
    }
}
