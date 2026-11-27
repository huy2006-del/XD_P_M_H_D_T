package com.example.app.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public record SpoilageReportResponse(
        Summary summary,
        List<BatchItem> batches,
        List<ProductDistribution> distribution
) {
    public record Summary(
            BigDecimal totalLossAmount,
            long totalSpoiledQuantity,
            int totalBatchesExpired,
            double averageSpoilageRate
    ) {}

    public record BatchItem(
            Long id,
            Long productId,
            String productName,
            String batchCode,
            String supplier,
            LocalDate importDate,
            LocalDate expiryDate,
            int quantityImported,
            int quantitySpoiled,
            BigDecimal unitCost,
            BigDecimal totalLoss,
            double spoilageRate,
            long daysOverdue
    ) {}

    public record ProductDistribution(
            String name,
            long spoiledQuantity,
            BigDecimal totalLoss,
            double lossRate
    ) {}
}
