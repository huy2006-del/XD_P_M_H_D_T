package com.freshvend.identity_service.controller;

import com.freshvend.identity_service.dto.AuditLogResponse;
import com.freshvend.identity_service.dto.response.ApiResponse;
import com.freshvend.identity_service.service.AuditLogService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/v1/audit-logs")
public class AuditLogController {

    private final AuditLogService auditLogService;

    public AuditLogController(AuditLogService auditLogService) {
        this.auditLogService = auditLogService;
    }

    @GetMapping
    public ApiResponse<List<AuditLogResponse>> getAuditLogs(
            @RequestParam(required = false) Long userId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate) {

        List<AuditLogResponse> result = auditLogService.getAuditLogs(userId, startDate, endDate);
        
        return ApiResponse.<List<AuditLogResponse>>builder()
                .result(result)
                .build();
    }
}
