package com.example.app.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "alerts")
@Getter
@NoArgsConstructor
public class Alert {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "machine_id", nullable = false)
    private Long machineId;

    @Enumerated(EnumType.STRING)
    @Column(name = "alert_type", nullable = false, length = 30)
    private AlertType alertType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private AlertSeverity severity;

    @Column(nullable = false, length = 1000)
    private String message;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private AlertStatus status = AlertStatus.ACTIVE;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "resolved_at")
    private LocalDateTime resolvedAt;

    @Column(name = "resolved_by", length = 150)
    private String resolvedBy;

    @Column(name = "resolution_note", length = 2000)
    private String resolutionNote;

    public Alert(Long machineId, AlertType alertType, AlertSeverity severity,
                 String message, LocalDateTime createdAt) {
        this.machineId = machineId;
        this.alertType = alertType;
        this.severity = severity;
        this.message = message;
        this.createdAt = createdAt;
    }

    public boolean escalateToCritical(String message) {
        if (severity == AlertSeverity.CRITICAL) {
            return false;
        }
        severity = AlertSeverity.CRITICAL;
        this.message = message;
        return true;
    }

    public void acknowledge() {
        if (status != AlertStatus.ACTIVE) {
            throw new IllegalStateException("Chỉ cảnh báo đang ACTIVE mới có thể tiếp nhận.");
        }
        status = AlertStatus.ACKNOWLEDGED;
    }

    public void resolve(String resolvedBy, String resolutionNote, LocalDateTime resolvedAt) {
        if (status == AlertStatus.RESOLVED) {
            throw new IllegalStateException("Cảnh báo đã được xử lý trước đó.");
        }
        status = AlertStatus.RESOLVED;
        this.resolvedBy = resolvedBy;
        this.resolutionNote = resolutionNote;
        this.resolvedAt = resolvedAt;
    }
}
