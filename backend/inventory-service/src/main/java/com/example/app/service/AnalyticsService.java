package com.example.app.service;

import com.example.app.dto.AnalyticsOverviewResponse;
import com.example.app.dto.DailyRevenueResponse;
import com.example.app.entity.PaymentStatus;
import com.example.app.repository.OrderRepository;
import com.example.app.repository.SlotBatchInventoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.sql.Date;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class AnalyticsService {

    private final OrderRepository orderRepository;
    private final SlotBatchInventoryRepository slotBatchInventoryRepository;

    @Transactional(readOnly = true)
    public AnalyticsOverviewResponse getOverview() {
        BigDecimal todayRevenue = orderRepository.sumTodayRevenue();
        BigDecimal thisMonthRevenue = orderRepository.sumThisMonthRevenue();
        long successCount = orderRepository.countByPaymentStatus(PaymentStatus.SUCCESS);
        long failedCount = orderRepository.countByPaymentStatus(PaymentStatus.FAILED);

        // Tính tỷ lệ lấp đầy tồn kho dựa trên SlotBatchInventory
        long totalSlots = slotBatchInventoryRepository.count();
        double fillRate = 0.0;
