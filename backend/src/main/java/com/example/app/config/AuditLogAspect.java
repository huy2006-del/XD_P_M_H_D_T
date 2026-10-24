package com.example.app.config;

import com.example.app.service.AuditLogService;
import org.aspectj.lang.JoinPoint;
import org.aspectj.lang.annotation.AfterReturning;
import org.aspectj.lang.annotation.Aspect;
import org.springframework.stereotype.Component;

@Aspect
@Component
public class AuditLogAspect {

    private final AuditLogService auditLogService;

    public AuditLogAspect(AuditLogService auditLogService) {
        this.auditLogService = auditLogService;
    }

    @AfterReturning(pointcut = "@annotation(logActivity)", returning = "result")
    public void logExecution(JoinPoint joinPoint, LogActivity logActivity, Object result) {
        // Tạm thời lấy mock ID và Username (sau này tích hợp SecurityContext/JWT sẽ lấy tự động)
        Long userId = 1L; 
        String username = "admin";

        String entityId = "N/A";
        String details = logActivity.details().isEmpty() 
                ? "Thao tác thành công trên " + logActivity.entity() 
                : logActivity.details();

        auditLogService.logActivity(
                userId,
                username,
                logActivity.action(),
                logActivity.entity(),
                entityId,
                details
        );
    }
}
