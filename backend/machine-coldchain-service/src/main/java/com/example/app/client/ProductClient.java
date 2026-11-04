package com.example.app.client;

import com.example.app.dto.ProductDTO;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

@FeignClient(name = "inventory-service")
public interface ProductClient {

    @GetMapping("/api/v1/products/{id}")
    ProductDTO getById(@PathVariable("id") Long id);
}
