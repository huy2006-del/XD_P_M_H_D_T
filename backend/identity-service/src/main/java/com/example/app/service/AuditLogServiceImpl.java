package com.example.app.service;

import com.example.app.dto.AuditLogRequest;
import com.example.app.dto.AuditLogResponse;
import com.example.app.entity.AuditLog;
import com.example.app.repository.AuditLogRepository;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AuditLogServiceImpl implements AuditLogService {

    private final AuditLogRepository auditLogRepository;

    @Override
    @Transactional
    public AuditLogResponse createAuditLog(AuditLogRequest request) {
        // Ưu tiên lấy actor thực tế từ Header đã được API Gateway verify chữ ký JWT
        Long actorId = resolveLongHeader("X-User-Id", request.getUserId());
        String actorUsername = resolveStringHeader("X-User-Name", request.getUsername());

        AuditLog auditLog = AuditLog.builder()
                .action(request.getAction())
                .userId(actorId)
                .username(actorUsername)
                .details(request.getDetails())
                .build();

        AuditLog saved = auditLogRepository.save(auditLog);
        return mapToResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public List<AuditLogResponse> getAllAuditLogs() {
        return auditLogRepository.findAllByOrderByCreatedAtDesc()
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    private Long resolveLongHeader(String headerName, Long fallbackValue) {
        String headerValue = getHeaderValue(headerName);
        if (headerValue != null) {
            try {
                return Long.parseLong(headerValue);
            } catch (NumberFormatException ignored) {
                // Nếu header không phải số (vd: token MACHINE), dùng fallbackValue
            }
        }
        return fallbackValue;
    }

    private String resolveStringHeader(String headerName, String fallbackValue) {
        String headerValue = getHeaderValue(headerName);
        if (headerValue != null) {
            return headerValue;
        }
        return fallbackValue != null ? fallbackValue : "SYSTEM";
    }

    private String getHeaderValue(String headerName) {
        ServletRequestAttributes attributes = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
        if (attributes != null) {
            HttpServletRequest httpRequest = attributes.getRequest();
            String headerValue = httpRequest.getHeader(headerName);
            if (headerValue != null && !headerValue.isBlank()) {
                return headerValue;
            }
        }
        return null;
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