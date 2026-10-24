package com.example.app.config;

import com.example.app.dto.ApiResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

// name: tên service trong eureka / application.yml của inventory-service
@FeignClient(name = "inventory-service", path = "/api/v1/products")
public interface InventoryClient {

    @GetMapping("/{id}")
    ApiResponse<Object> getProductById(@PathVariable("id") Long id);
}
