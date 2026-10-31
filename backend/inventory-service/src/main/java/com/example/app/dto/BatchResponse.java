package com.example.app.dto;

import com.example.app.entity.FruitBatch;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;

public record BatchResponse(
        Long id, Long productId, String productName, String batchCode, String supplier,
        LocalDate importDate, LocalDate expiryDate, int quantityImported, int quantityRemaining,
        BigDecimal unitCost, boolean expired, long daysToExpiry
) {
    /** Phải gọi trong transaction vì product là lazy. */
    public static BatchResponse from(FruitBatch b) {
        LocalDate today = LocalDate.now();
        return new BatchResponse(b.getId(), b.getProduct().getId(), b.getProduct().getName(), b.getBatchCode(),
                b.getSupplier(), b.getImportDate(), b.getExpiryDate(), b.getQuantityImported(),
                b.getQuantityRemaining(), b.getUnitCost(), b.isExpired(today),
                ChronoUnit.DAYS.between(today, b.getExpiryDate()));
    }
}
