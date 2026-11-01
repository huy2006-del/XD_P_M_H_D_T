package com.example.app.service;

import com.example.app.dto.AuditLogRequest;
import com.example.app.dto.AuditLogResponse;

import java.util.List;

public interface AuditLogService {
    AuditLogResponse createAuditLog(AuditLogRequest request);
    List<AuditLogResponse> getAllAuditLogs();
}