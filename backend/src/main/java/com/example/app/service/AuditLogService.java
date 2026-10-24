package com.example.app.service;

import com.example.app.dto.AuditLogResponse;
import com.example.app.entity.ActionType;
import com.example.app.entity.AuditLog;
import com.example.app.entity.EntityType;
import com.example.app.repository.AuditLogRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class AuditLogService {

    private final AuditLogRepository auditLogRepository;

    public AuditLogService(AuditLogRepository auditLogRepository) {
        this.auditLogRepository = auditLogRepository;
    }

    public void logActivity(Long userId, String username, ActionType action, EntityType entityName, String entityId, String details) {
        AuditLog auditLog = AuditLog.builder()
                .userId(userId)
                .username(username)
                .action(action)
                .entityName(entityName)
                .entityId(entityId)
                .details(details)
                .build();

        auditLogRepository.save(auditLog);
    }

    public List<AuditLogResponse> getAuditLogs(Long userId, LocalDateTime startDate, LocalDateTime endDate) {
        List<AuditLog> logs;

        if (userId != null && startDate != null && endDate != null) {
            logs = auditLogRepository.findByUserIdAndCreatedAtBetween(userId, startDate, endDate);
        } else if (userId != null) {
            logs = auditLogRepository.findByUserId(userId);
        } else if (startDate != null && endDate != null) {
            logs = auditLogRepository.findByCreatedAtBetween(startDate, endDate);
        } else {
            logs = auditLogRepository.findAll();
        }

        return logs.stream().map(log -> new AuditLogResponse(
                log.getId(),
                log.getUserId(),
                log.getUsername(),
                log.getAction(),
                log.getEntityName(),
                log.getEntityId(),
                log.getDetails(),
                log.getCreatedAt()
        )).toList();
    }
}