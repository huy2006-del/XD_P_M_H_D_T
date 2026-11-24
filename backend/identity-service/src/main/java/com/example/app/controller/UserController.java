package com.example.app.controller;

import com.example.app.dto.ApiResponse;
import com.example.app.dto.UserCreationRequest;
import com.example.app.dto.UserResponse;
import com.example.app.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.experimental.FieldDefaults;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/users")
@FieldDefaults(level = AccessLevel.PRIVATE)
@PreAuthorize("hasRole('ADMIN')")
@Tag(name = "2. User Management", description = "Quản lý tài khoản nhân sự | Gateway Route: /api/v1/users/** | Role: ADMIN only")
public class UserController {
    final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @PostMapping
    @Operation(
            summary = "Tạo tài khoản nhân viên mới (ADMIN / OPERATOR)",
            description = "**Role yêu cầu:** Chỉ `ADMIN`.\n\n" +
                    "**Gateway Route:** `POST http://localhost:8080/api/v1/users`"
    )
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Tạo tài khoản thành công"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400", description = "Dữ liệu không hợp lệ hoặc username đã tồn tại"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "401", description = "Thiếu hoặc hết hạn JWT Token"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "403", description = "Role OPERATOR không có quyền tạo user")
    })
    public ApiResponse<UserResponse> createUser(@RequestBody @Valid UserCreationRequest request) {
        return ApiResponse.<UserResponse>builder()
                .result(userService.createUser(request))
                .build();
    }

    @GetMapping
    @Operation(
            summary = "Lấy danh sách toàn bộ nhân sự",
            description = "**Role yêu cầu:** Chỉ `ADMIN`.\n\n" +
                    "**Gateway Route:** `GET http://localhost:8080/api/v1/users`"
    )
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Lấy danh sách thành công"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "401", description = "Thiếu hoặc hết hạn JWT Token"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "403", description = "Role OPERATOR không có quyền xem danh sách user")
    })
    public ApiResponse<List<UserResponse>> getUsers() {
        return ApiResponse.<List<UserResponse>>builder()
                .result(userService.getUsers())
                .build();
    }
}