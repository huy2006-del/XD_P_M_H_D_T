package com.example.app.controller;

import com.example.app.dto.LoginRequest;
import com.example.app.dto.LoginResponse;
import com.example.app.service.AuthService;
import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class AuthController {

    AuthService authService;

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@RequestBody @Valid LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }

    @GetMapping("/me")
    public ResponseEntity<LoginResponse.UserProfileDto> me(Authentication authentication) {
        if (authentication instanceof JwtAuthenticationToken jwt) {
            String userId = jwt.getToken().getClaimAsString("userId");
            String role = jwt.getToken().getClaimAsString("role");
            return ResponseEntity.ok(LoginResponse.UserProfileDto.builder()
                    .id(userId != null ? userId : authentication.getName())
                    .username(authentication.getName())
                    .role(role != null ? role : "OPERATOR")
                    .build());
        }
        return ResponseEntity.ok(authService.getCurrentUser(authentication != null ? authentication.getName() : null));
    }
}
