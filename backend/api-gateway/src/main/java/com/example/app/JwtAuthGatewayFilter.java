package com.example.app;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.http.server.reactive.ServerHttpResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.List;

@Component
public class JwtAuthGatewayFilter implements GlobalFilter, Ordered {

    @Value("${jwt.secret}")
    private String jwtSecret;

    @Value("${internal.gateway.secret}")
    private String internalGatewaySecret;

    private static final List<String> PUBLIC_PATHS = List.of(
            "/api/v1/auth/login",
            "/api/v1/auth/refresh",
            "/api/v1/auth/machine-token",
            "/api/v1/payments/webhook"
    );

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        ServerHttpRequest request = exchange.getRequest();
        String path = request.getURI().getPath();
        HttpMethod method = request.getMethod();

        // 1. Cho phép CORS Preflight (OPTIONS) và WebSocket /ws-freshvend/** đi qua
        if (method == HttpMethod.OPTIONS || path.startsWith("/ws-freshvend")) {
            return forwardWithInternalHeaders(exchange, chain, null, null, null);
        }

        // 2. Cho phép các Public Endpoint & Kiosk Endpoint đi qua không cần Token
        if (isPublicEndpoint(path, method)) {
            return forwardWithInternalHeaders(exchange, chain, null, null, null);
        }

        // 3. Kiểm tra Header Authorization: Bearer <token>
        String authHeader = request.getHeaders().getFirst(HttpHeaders.AUTHORIZATION);
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return onError(exchange, "UNAUTHORIZED", "Missing or invalid Authorization header", HttpStatus.UNAUTHORIZED);
        }

        String token = authHeader.substring(7);

        try {
            // 4. Verify chữ ký & thời hạn Token (JJWT 0.12.x)
            SecretKey key = Keys.hmacShaKeyFor(jwtSecret.getBytes(StandardCharsets.UTF_8));
            Claims claims = Jwts.parser()
                    .verifyWith(key)
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();

            Object userIdObj = claims.get("userId");
            String userId = userIdObj != null ? String.valueOf(userIdObj) : claims.getSubject();
            String username = claims.get("username", String.class);
            String role = claims.get("role", String.class);

            if (userId == null || role == null) {
                return onError(exchange, "TOKEN_INVALID", "Invalid token claims", HttpStatus.UNAUTHORIZED);
            }

            // 5. Chặn cứng các API chỉ dành cho ADMIN ngay tại Gateway (trả về 403 Forbidden)
            if (isAdminOnlyEndpoint(path, method) && !"ADMIN".equals(role)) {
                return onError(exchange, "FORBIDDEN", "Access denied: ADMIN role required", HttpStatus.FORBIDDEN);
            }

            // 6. Chuyển tiếp danh tính đã xác thực & Internal Secret xuống service con
            return forwardWithInternalHeaders(exchange, chain, userId, username, role);

        } catch (ExpiredJwtException e) {
            return onError(exchange, "TOKEN_EXPIRED", "JWT token has expired", HttpStatus.UNAUTHORIZED);
        } catch (Exception e) {
            return onError(exchange, "TOKEN_INVALID", "Invalid JWT signature", HttpStatus.UNAUTHORIZED);
        }
    }

    private boolean isPublicEndpoint(String path, HttpMethod method) {
        if (PUBLIC_PATHS.stream().anyMatch(path::startsWith)) {
            return true;
        }

        // Các endpoint đọc dữ liệu cho màn hình Kiosk
        if (method == HttpMethod.GET && (
                path.startsWith("/api/v1/products") ||
                path.startsWith("/uploads/products") ||
                path.matches("/api/v1/machines/[^/]+/slots") ||
                path.matches("/api/v1/slots/[^/]+/inventory") ||
                path.matches("/api/v1/orders/[^/]+")
        )) {
            return true;
        }

        // Các endpoint Kiosk tạo đơn thanh toán QR & gửi nhịp tim (Heartbeat)
        if (method == HttpMethod.POST && (
                path.equals("/api/v1/orders") ||
                path.matches("/api/v1/machines/[^/]+/heartbeat")
        )) {
            return true;
        }

        return false;
    }

    private boolean isAdminOnlyEndpoint(String path, HttpMethod method) {
        // Các nhóm API cấm tuyệt đối OPERATOR truy cập dưới mọi method
        if (path.startsWith("/api/v1/users") ||
            path.startsWith("/api/v1/analytics") ||
            path.startsWith("/api/v1/reports") ||
            path.startsWith("/api/v1/simulator")) {
            return true;
        }

        // Chỉ ADMIN được xem lịch sử Audit Log (OPERATOR vẫn được POST để ghi log khi restock/resolve alert)
        if (path.startsWith("/api/v1/audit-logs") && method == HttpMethod.GET) {
            return true;
        }

        // Chỉ ADMIN được thêm/sửa/xóa sản phẩm (GET đã mở ở isPublicEndpoint)
        if (path.startsWith("/api/v1/products") && method != HttpMethod.GET) {
            return true;
        }

        // Chỉ ADMIN được cấu hình máy, địa điểm, khay hàng và ngưỡng nhiệt độ
        if (path.startsWith("/api/v1/locations") && method != HttpMethod.GET) {
            return true;
        }
        if (path.startsWith("/api/v1/machines") && method != HttpMethod.GET) {
            return true;
        }
        if (path.startsWith("/api/v1/slots") && method != HttpMethod.GET) {
            return true;
        }

        return false;
    }

    private Mono<Void> forwardWithInternalHeaders(ServerWebExchange exchange, GatewayFilterChain chain,
                                                  String userId, String username, String role) {
        ServerHttpRequest.Builder mutatedRequest = exchange.getRequest().mutate()
                .headers(h -> {
                    h.remove("X-User-Id");
                    h.remove("X-User-Name");
                    h.remove("X-User-Role");
                    h.remove("X-Gateway-Secret");
                })
                .header("X-Gateway-Secret", internalGatewaySecret);

        if (userId != null) {
            mutatedRequest.header("X-User-Id", userId)
                          .header("X-User-Name", username != null ? username : "")
                          .header("X-User-Role", role);
        }

        return chain.filter(exchange.mutate().request(mutatedRequest.build()).build());
    }

    private Mono<Void> onError(ServerWebExchange exchange, String code, String message, HttpStatus status) {
        ServerHttpResponse response = exchange.getResponse();
        response.setStatusCode(status);
        response.getHeaders().setContentType(MediaType.APPLICATION_JSON);
        String body = String.format("{\"status\":%d,\"error\":\"%s\",\"code\":\"%s\",\"message\":\"%s\"}",
                status.value(), status.getReasonPhrase(), code, message);
        return response.writeWith(Mono.just(response.bufferFactory().wrap(body.getBytes(StandardCharsets.UTF_8))));
    }

    @Override
    public int getOrder() {
        return -1;
    }
}