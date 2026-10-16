package com.example.app.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import java.nio.file.Path;
import java.nio.file.Paths;

@Configuration
public class ProductImageWebConfig implements WebMvcConfigurer {
    private final String uploadDir;
    public ProductImageWebConfig(@Value("${app.upload-dir:uploads/products}") String uploadDir) { this.uploadDir = uploadDir; }
    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        Path path = Paths.get(uploadDir).toAbsolutePath().normalize();
        registry.addResourceHandler("/uploads/products/**").addResourceLocations(path.toUri().toString());
    }
}
