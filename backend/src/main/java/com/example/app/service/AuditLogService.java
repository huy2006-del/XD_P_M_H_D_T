package com.freshvend.identity_service.service;

import com.freshvend.identity_service.dto.AuditLogResponse;
import com.freshvend.identity_service.entity.AuditLog;
import com.freshvend.identity_service.enums.ActionType;
import com.freshvend.identity_service.enums.EntityType;
import com.freshvend.identity_service.repository.AuditLogRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class AuditLogService {

    private final AuditLogRepository auditLogRepository;

    // Constructor injection viết tay
    public AuditLogService(AuditLogRepository auditLogRepository) {
        this.auditLogRepository = auditLogRepository;
    }

    // Tắt cảnh báo null safety
    @SuppressWarnings("null")
    public void logActivity(Long userId, String username, ActionType action, EntityType entityName, String entityId, String details) {
        auditLogRepository.save(AuditLog.builder()
                .userId(userId)
                .username(username)
                .action(action)
                .entityName(entityName)
                .entityId(entityId)
                .details(details)
                .build());
    }

    // Hàm lấy danh sách log theo bộ lọc
    public List<AuditLogResponse> getAuditLogs(Long userId, LocalDateTime startDate, LocalDateTime endDate) {
        return auditLogRepository.filterAuditLogs(userId, startDate, endDate)
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    private AuditLogResponse mapToResponse(AuditLog log) {
        return AuditLogResponse.builder()
                .id(log.getId())
                .userId(log.getUserId())
                .username(log.getUsername())
                .action(log.getAction())
                .entityName(log.getEntityName())
                .entityId(log.getEntityId())
                .details(log.getDetails())
                .createdAt(log.getCreatedAt())
                .build();
    }
}
