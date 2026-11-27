package com.example.app.service;

import com.example.app.controller.AuditLogController;
import com.example.app.dto.AuditLogRequest;
import com.example.app.dto.AuditLogResponse;
import com.example.app.entity.AuditAction;
import com.example.app.entity.AuditLog;
import com.example.app.repository.AuditLogRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuditLogServiceTest {

    @Mock
    private AuditLogRepository auditLogRepository;

    private AuditLogServiceImpl auditLogService;
    private AuditLogController auditLogController;

    @BeforeEach
    void setUp() {
        auditLogService = new AuditLogServiceImpl(auditLogRepository);
        auditLogController = new AuditLogController(auditLogService);
    }

    @Test
    void createAuditLog_SavesAndReturnsResponse() {
        LocalDateTime now = LocalDateTime.now();
        when(auditLogRepository.save(any(AuditLog.class))).thenAnswer(invocation -> {
            AuditLog log = invocation.getArgument(0);
            log.setId(101L);
            log.setCreatedAt(now);
            return log;
        });

        AuditLogRequest request = AuditLogRequest.builder()
                .action(AuditAction.THRESHOLD_UPDATED)
                .userId(1L)
                .username("admin")
                .details("Updated machine M-01 threshold to 2-8C")
                .build();

        ResponseEntity<AuditLogResponse> responseEntity = auditLogController.createAuditLog(request);

        assertEquals(HttpStatus.CREATED, responseEntity.getStatusCode());
        AuditLogResponse response = responseEntity.getBody();
        assertNotNull(response);
        assertEquals(101L, response.getId());
        assertEquals(AuditAction.THRESHOLD_UPDATED, response.getAction());
        assertEquals(1L, response.getUserId());
        assertEquals("admin", response.getUsername());
        assertEquals("Updated machine M-01 threshold to 2-8C", response.getDetails());
        assertEquals(now, response.getCreatedAt());
    }

    @Test
    void getAllAuditLogs_ReturnsOrderedLogs() {
        LocalDateTime t1 = LocalDateTime.now();
        LocalDateTime t2 = t1.minusMinutes(10);

        AuditLog log1 = AuditLog.builder()
                .id(2L)
                .action(AuditAction.RESTOCK_COMPLETED)
                .userId(2L)
                .username("operator1")
                .details("Completed restock session #55")
                .createdAt(t1)
                .build();

        AuditLog log2 = AuditLog.builder()
                .id(1L)
                .action(AuditAction.USER_LOGIN)
                .userId(2L)
                .username("operator1")
                .details("Operator logged in")
                .createdAt(t2)
                .build();

        when(auditLogRepository.findAllByOrderByCreatedAtDesc()).thenReturn(List.of(log1, log2));

        ResponseEntity<List<AuditLogResponse>> responseEntity = auditLogController.getAllAuditLogs();

        assertEquals(HttpStatus.OK, responseEntity.getStatusCode());
        List<AuditLogResponse> logs = responseEntity.getBody();
        assertNotNull(logs);
        assertEquals(2, logs.size());
        assertEquals(2L, logs.get(0).getId());
        assertEquals(AuditAction.RESTOCK_COMPLETED, logs.get(0).getAction());
        assertEquals(1L, logs.get(1).getId());
        assertEquals(AuditAction.USER_LOGIN, logs.get(1).getAction());
    }
}
