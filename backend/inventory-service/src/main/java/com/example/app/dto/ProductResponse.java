package com.example.app.dto;

import com.example.app.entity.Product;
import java.math.BigDecimal;
import java.time.Instant;

public record ProductResponse(
        String id, String name, String sku, BigDecimal price, String unit,
        String imageUrl, Integer shelfLifeDays, BigDecimal minTempC, BigDecimal maxTempC,
        boolean isActive, String description, Instant createdAt, Instant updatedAt
) {
    public static ProductResponse from(Product p) {
        return new ProductResponse(String.valueOf(p.getId()), p.getName(), p.getSku(), p.getPrice(),
                p.getUnit(), p.getImageUrl(), p.getShelfLifeDays(), p.getMinTempC(), p.getMaxTempC(),
                p.isActive(), p.getDescription(), p.getCreatedAt(), p.getUpdatedAt());
    }
}
