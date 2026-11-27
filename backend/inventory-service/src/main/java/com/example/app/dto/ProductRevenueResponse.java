package com.example.app.dto;

import java.math.BigDecimal;

public record ProductRevenueResponse(
        Long productId,
        String productName,
        long totalQuantity,
        BigDecimal totalRevenue
) {}
