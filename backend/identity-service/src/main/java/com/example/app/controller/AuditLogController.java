package com.example.app.controller;

import com.example.app.dto.AuditLogRequest;
import com.example.app.dto.AuditLogResponse;
import com.example.app.service.AuditLogService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/audit-logs")
@RequiredArgsConstructor
@Tag(name = "3. Audit Logs", description = "Nhật ký kiểm toán thao tác hệ thống | Gateway Route: /api/v1/audit-logs/**")
public class AuditLogController {

    private final AuditLogService auditLogService;

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'OPERATOR', 'MACHINE')")
    @Operation(
            summary = "Ghi nhận nhật ký thao tác hệ thống",
            description = "**Role yêu cầu:** `ADMIN`, `OPERATOR`, hoặc `MACHINE`.\n\n" +
                    "**Gateway Route:** `POST http://localhost:8080/api/v1/audit-logs`\n\n" +
                    "Dùng để ghi nhận các hành động: `USER_LOGIN`, `USER_CREATED`, `RESTOCK_COMPLETED`, `ALERT_RESOLVED`, `THRESHOLD_UPDATED`."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Ghi nhận Audit Log thành công"),
            @ApiResponse(responseCode = "400", description = "Dữ liệu đầu vào không hợp lệ (sai giá trị enum action hoặc thiếu details)"),
            @ApiResponse(responseCode = "401", description = "Thiếu hoặc hết hạn JWT Token"),
            @ApiResponse(responseCode = "403", description = "Không đủ quyền thực hiện")
    })
    public ResponseEntity<AuditLogResponse> createAuditLog(@Valid @RequestBody AuditLogRequest request) {
        AuditLogResponse response = auditLogService.createAuditLog(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(
            summary = "Xem toàn bộ lịch sử kiểm toán hệ thống",
            description = "**Role yêu cầu:** Chỉ `ADMIN`.\n\n" +
                    "**Gateway Route:** `GET http://localhost:8080/api/v1/audit-logs`"
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Lấy danh sách lịch sử kiểm toán thành công"),
            @ApiResponse(responseCode = "401", description = "Thiếu hoặc hết hạn JWT Token"),
            @ApiResponse(responseCode = "403", description = "Role OPERATOR không có quyền xem lịch sử kiểm toán")
    })
    public ResponseEntity<List<AuditLogResponse>> getAllAuditLogs() {
        return ResponseEntity.ok(auditLogService.getAllAuditLogs());
    }
}