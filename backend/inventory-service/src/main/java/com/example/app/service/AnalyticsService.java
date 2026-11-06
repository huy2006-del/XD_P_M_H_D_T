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
        if (totalSlots > 0) {
            long filledSlots = slotBatchInventoryRepository.findAll().stream()
                    .filter(slot -> slot.getQuantity() > 0) // <-- Đã bỏ đoạn != null bị lỗi
                    .count();
            fillRate = Math.round(((double) filledSlots / totalSlots * 100) * 100.0) / 100.0;
        }

        return AnalyticsOverviewResponse.builder()
                .todayRevenue(todayRevenue != null ? todayRevenue : BigDecimal.ZERO)
                .thisMonthRevenue(thisMonthRevenue != null ? thisMonthRevenue : BigDecimal.ZERO)
                .successOrderCount(successCount)
                .failedOrderCount(failedCount)
                .inventoryFillRate(fillRate)
                .build();
    }

    @Transactional(readOnly = true)
    public List<DailyRevenueResponse> getRevenueChart(int days) {
        LocalDateTime startDate = LocalDate.now().minusDays(days - 1).atStartOfDay();
        List<Object[]> results = orderRepository.findDailyRevenueFrom(startDate);

        Map<LocalDate, BigDecimal> revenueMap = new HashMap<>();
        for (Object[] row : results) {
            LocalDate date = ((Date) row[0]).toLocalDate();
            BigDecimal rev = (BigDecimal) row[1];
            revenueMap.put(date, rev);
        }

        List<DailyRevenueResponse> chartData = new ArrayList<>();
        for (int i = days - 1; i >= 0; i--) {
            LocalDate date = LocalDate.now().minusDays(i);
            BigDecimal rev = revenueMap.getOrDefault(date, BigDecimal.ZERO);
            chartData.add(new DailyRevenueResponse(date, rev));
        }

        return chartData;
    }
}