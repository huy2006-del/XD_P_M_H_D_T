package com.example.app.dto;

import java.math.BigDecimal;

public record PeakHourRevenueResponse(
        int hour,
        long orderCount,
        BigDecimal totalRevenue
) {}
