package com.example.app.service;

import com.example.app.dto.AuditLogRequest;
import com.example.app.dto.AuditLogResponse;
import com.example.app.entity.AuditLog;
import com.example.app.repository.AuditLogRepository;
import com.example.app.service.AuditLogService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AuditLogServiceImpl implements AuditLogService {

    private final AuditLogRepository auditLogRepository;

    @Override
    public AuditLogResponse createAuditLog(AuditLogRequest request) {
        AuditLog auditLog = AuditLog.builder()
                .action(request.getAction())
                .userId(request.getUserId())
                .username(request.getUsername())
                .details(request.getDetails())
                .build();

        AuditLog saved = auditLogRepository.save(auditLog);

        return mapToResponse(saved);
    }

    @Override
    public List<AuditLogResponse> getAllAuditLogs() {
        return auditLogRepository.findAllByOrderByCreatedAtDesc()
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    private AuditLogResponse mapToResponse(AuditLog auditLog) {
        return AuditLogResponse.builder()
                .id(auditLog.getId())
                .action(auditLog.getAction())
                .userId(auditLog.getUserId())
                .username(auditLog.getUsername())
                .details(auditLog.getDetails())
                .createdAt(auditLog.getCreatedAt())
                .build();
    }
}