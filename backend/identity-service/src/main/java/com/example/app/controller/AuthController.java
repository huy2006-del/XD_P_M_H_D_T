package com.example.app.controller;

import com.example.app.dto.LoginRequest;
import com.example.app.dto.LoginResponse;
import com.example.app.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Tag(name = "1. Authentication", description = "Đăng nhập & Cấp phát JWT Token | Gateway Route: /api/v1/auth/**")
public class AuthController {

    AuthService authService;

    @PostMapping("/login")
    @Operation(
            summary = "Đăng nhập hệ thống lấy JWT Access Token",
            description = "**Role yêu cầu:** `PUBLIC` (Không cần token).\n\n" +
                    "**Gateway Route:** `POST http://localhost:8080/api/v1/auth/login`\n\n" +
                    "**Tài khoản mặc định:** `admin` / `Admin@123` (Role ADMIN) hoặc `operator1` / `Operator@123` (Role OPERATOR)."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Đăng nhập thành công, trả về accessToken (hạn 24h) và thông tin user"),
            @ApiResponse(responseCode = "400", description = "Thiếu username hoặc password"),
            @ApiResponse(responseCode = "401", description = "Sai tên đăng nhập hoặc mật khẩu, hoặc tài khoản đã bị vô hiệu hóa")
    })
    public ResponseEntity<LoginResponse> login(@RequestBody @Valid LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }
}