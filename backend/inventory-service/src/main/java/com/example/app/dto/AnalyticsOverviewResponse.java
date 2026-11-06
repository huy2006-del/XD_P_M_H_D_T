package com.example.app.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AnalyticsOverviewResponse {
    private BigDecimal todayRevenue;
    private BigDecimal thisMonthRevenue;
    private long successOrderCount;
    private long failedOrderCount;
    private double inventoryFillRate; // Tỷ lệ lấp đầy %
}