package com.example.app.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

@Component
public class InternalAuthFilter extends OncePerRequestFilter {

    @Value("${internal.gateway.secret}")
    private String internalGatewaySecret;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        // [THÊM MỚI] Cho phép tải giao diện Swagger UI & OpenAPI JSON
        String uri = request.getRequestURI();
        if (uri.startsWith("/swagger-ui") || uri.startsWith("/v3/api-docs")) {
            filterChain.doFilter(request, response);
            return;
        }

        // 1. Chặn mọi request gọi thẳng cổng 8081 bỏ qua API Gateway
        String gatewaySecret = request.getHeader("X-Gateway-Secret");
        if (gatewaySecret == null || !gatewaySecret.equals(internalGatewaySecret)) {
            response.setStatus(HttpStatus.FORBIDDEN.value());
            response.setContentType("application/json;charset=UTF-8");
            response.getWriter().write("{\"status\":403,\"error\":\"Forbidden\",\"message\":\"Direct access to identity-service is blocked\"}");
            return;
        }

        // 2. Lấy userId & role do Gateway truyền xuống qua Header
        String userId = request.getHeader("X-User-Id");
        String rawRole = request.getHeader("X-User-Role");

        if (userId != null && rawRole != null && !rawRole.isBlank()) {
            String springRole = rawRole.startsWith("ROLE_") ? rawRole : "ROLE_" + rawRole;
            UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
                    userId,
                    null,
                    List.of(new SimpleGrantedAuthority(springRole))
            );
            SecurityContextHolder.getContext().setAuthentication(auth);
        }

        filterChain.doFilter(request, response);
    }
}