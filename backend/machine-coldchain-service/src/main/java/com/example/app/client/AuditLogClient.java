package com.example.app.client;

import com.example.app.dto.event.AuditLogEvent;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

@FeignClient(name = "identity-service")
public interface AuditLogClient {

    @PostMapping("/api/v1/audit-logs")
    void recordAuditLog(@RequestBody AuditLogEvent request);
}
