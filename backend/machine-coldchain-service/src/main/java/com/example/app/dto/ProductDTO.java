package com.example.app.dto;

import java.math.BigDecimal;

public record ProductDTO(
        String id,
        String name,
        BigDecimal price,
        String imageUrl,
        boolean isActive
) {
}
