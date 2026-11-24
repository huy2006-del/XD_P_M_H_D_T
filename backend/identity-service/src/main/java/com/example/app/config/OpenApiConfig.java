package com.example.app.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import io.swagger.v3.oas.models.servers.Server;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI identityOpenAPI() {
        final String securitySchemeName = "bearerAuth";

        return new OpenAPI()
                .info(new Info()
                        .title("FreshVend - Identity & Security Service API")
                        .version("v1.0.0")
                        .description("""
                                Tài liệu API phân hệ Xác thực, Phân quyền & Nhật ký Kiểm toán.
                                
                                **Quy tắc gọi API:**
                                - Luôn chọn Server **API Gateway (`http://localhost:8080`)** khi test trên Swagger. Gọi trực tiếp port `8081` sẽ bị chặn (`403 Forbidden`).
                                - Tài khoản seed mặc định:
                                  + `admin` / `Admin@123` (Role: **ADMIN**)
                                  + `operator1` / `Operator@123` (Role: **OPERATOR**)
                                - Đăng nhập tại `POST /api/v1/auth/login` -> copy `accessToken` -> bấm nút **Authorize** góc phải trên và dán token vào.
                                """))
                .servers(List.of(
                        new Server().url("http://localhost:8080").description("API Gateway (Bắt buộc dùng)"),
                        new Server().url("http://localhost:8081").description("Direct Service (Nội bộ)")
                ))
                .addSecurityItem(new SecurityRequirement().addList(securitySchemeName))
                .components(new Components()
                        .addSecuritySchemes(securitySchemeName,
                                new SecurityScheme()
                                        .name(securitySchemeName)
                                        .type(SecurityScheme.Type.HTTP)
                                        .scheme("bearer")
                                        .bearerFormat("JWT")
                                        .description("Dán JWT Access Token (không cần gõ chữ Bearer)")));
    }
}