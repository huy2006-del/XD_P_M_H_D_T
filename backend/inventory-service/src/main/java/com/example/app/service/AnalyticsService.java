package com.example.app.service;

import com.example.app.dto.AnalyticsOverviewResponse;
import com.example.app.dto.DailyRevenueResponse;
import com.example.app.dto.PeakHourRevenueResponse;
import com.example.app.dto.ProductRevenueResponse;
import com.example.app.dto.MachineSlotInventoryResponse;
import com.example.app.client.MachineSlotClient;
import com.example.app.client.MachineSlotClient.MachineLocation;
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
import java.time.LocalTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Comparator;

@Service
@RequiredArgsConstructor
public class AnalyticsService {

    private final OrderRepository orderRepository;
    private final SlotBatchInventoryRepository slotBatchInventoryRepository;
    private final MachineSlotClient machineSlots;

    @Transactional(readOnly = true)
    public AnalyticsOverviewResponse getOverview() {
        return getOverview(null, null, null, null);
    }

    @Transactional(readOnly = true)
    public AnalyticsOverviewResponse getOverview(Long machineId, Long productId, LocalDate from, LocalDate to) {
        BigDecimal todayRevenue;
        BigDecimal thisMonthRevenue;
        long successCount;
        long failedCount;

        if (productId != null) {
            LocalDate today = LocalDate.now();
            LocalDate start = from != null ? from : today.withDayOfMonth(1);
            LocalDate end = to != null ? to : today;
            validateDates(start, end);
            LocalDateTime until = end.plusDays(1).atStartOfDay();
            todayRevenue = sumDailyRevenue(machineId, productId, today.atStartOfDay(), today.plusDays(1).atStartOfDay());
            thisMonthRevenue = sumDailyRevenue(machineId, productId, start.atStartOfDay(), until);
            successCount = orderRepository.countOrdersForProduct("SUCCESS", machineId, productId, start.atStartOfDay(), until);
            failedCount = orderRepository.countOrdersForProduct("FAILED", machineId, productId, start.atStartOfDay(), until);
        } else if (machineId == null && from == null && to == null) {
            todayRevenue = orderRepository.sumTodayRevenue();
            thisMonthRevenue = orderRepository.sumThisMonthRevenue();
            successCount = orderRepository.countByPaymentStatus(PaymentStatus.SUCCESS);
            failedCount = orderRepository.countByPaymentStatus(PaymentStatus.FAILED);
        } else {
            LocalDate effectiveFrom = from != null ? from : LocalDate.now().withDayOfMonth(1);
            LocalDate effectiveTo = to != null ? to : LocalDate.now();
            validateDates(effectiveFrom, effectiveTo);
            LocalDateTime rangeStart = effectiveFrom.atStartOfDay();
            LocalDateTime rangeEnd = effectiveTo.atTime(LocalTime.MAX);

            todayRevenue = orderRepository.sumRevenueFiltered(
                    machineId, LocalDate.now().atStartOfDay(), LocalDate.now().atTime(LocalTime.MAX));
            thisMonthRevenue = orderRepository.sumRevenueFiltered(machineId, rangeStart, rangeEnd);
            successCount = orderRepository.countByPaymentStatusFiltered(PaymentStatus.SUCCESS, machineId, rangeStart, rangeEnd);
            failedCount = orderRepository.countByPaymentStatusFiltered(PaymentStatus.FAILED, machineId, rangeStart, rangeEnd);
        }

        return AnalyticsOverviewResponse.builder()
                .todayRevenue(todayRevenue != null ? todayRevenue : BigDecimal.ZERO)
                .thisMonthRevenue(thisMonthRevenue != null ? thisMonthRevenue : BigDecimal.ZERO)
                .successOrderCount(successCount)
                .failedOrderCount(failedCount)
                .inventoryFillRate(inventoryFillRate(machineId, productId))
                .build();
    }

    private double inventoryFillRate(Long machineId, Long productId) {
        List<MachineSlotInventoryResponse> slots = machineId != null
                ? machineSlots.getMachineSlots(machineId)
                : machineSlots.getMachineLocations().stream()
                        .flatMap(machine -> machineSlots.getMachineSlots(machine.id()).stream()).toList();
        List<Long> slotIds = slots.stream()
                .filter(slot -> productId == null || productId.equals(slot.productId()))
                .map(MachineSlotInventoryResponse::slotId).distinct().toList();
        if (slotIds.isEmpty()) return 0.0;
        long filledSlots = slotBatchInventoryRepository.countFilledSlots(slotIds);
        return Math.round(filledSlots * 10_000.0 / slotIds.size()) / 100.0;
    }

    @Transactional(readOnly = true)
    public List<DailyRevenueResponse> getRevenueChart(int days) {
        return getRevenueChart(days, null, null, null, null);
    }

    @Transactional(readOnly = true)
    public List<DailyRevenueResponse> getRevenueChart(int days, Long machineId, Long productId, LocalDate from, LocalDate to) {
        int safeDays = Math.max(1, Math.min(days, 90));
        LocalDate end = to != null ? to : LocalDate.now();
        LocalDate start = from != null ? from : end.minusDays(safeDays - 1);
        validateDates(start, end);
        if (ChronoUnit.DAYS.between(start, end) >= 90) {
            throw new IllegalArgumentException("Revenue chart supports up to 90 days");
        }
        List<Object[]> results = orderRepository.findDailyRevenueBetween(
                machineId, productId, start.atStartOfDay(), end.plusDays(1).atStartOfDay());

        Map<LocalDate, BigDecimal> revenueMap = new HashMap<>();
        for (Object[] row : results) {
            LocalDate date = row[0] instanceof Date sqlDate
                    ? sqlDate.toLocalDate()
                    : LocalDate.parse(String.valueOf(row[0]));
            BigDecimal rev = row[1] instanceof BigDecimal bd ? bd : new BigDecimal(String.valueOf(row[1]));
            revenueMap.put(date, rev);
        }

        List<DailyRevenueResponse> chartData = new ArrayList<>();
        for (LocalDate date = start; !date.isAfter(end); date = date.plusDays(1)) {
            BigDecimal rev = revenueMap.getOrDefault(date, BigDecimal.ZERO);
            chartData.add(new DailyRevenueResponse(date, rev));
        }

        return chartData;
    }

    public record LocationRevenue(Long locationId, String locationName, long orderCount, BigDecimal totalRevenue) {}

    @Transactional(readOnly = true)
    public List<LocationRevenue> getRevenueByLocation(Long locationId, LocalDate from, LocalDate to) {
        LocalDate today = LocalDate.now();
        LocalDate start = from != null ? from : today.minusDays(30);
        LocalDate end = to != null ? to : today;
        validateDates(start, end);
        List<Object[]> rows = orderRepository.findRevenueByMachine(start.atStartOfDay(), end.plusDays(1).atStartOfDay());
        if (rows.isEmpty()) return List.of();

        Map<Long, MachineLocation.Location> locations = new HashMap<>();
        for (MachineLocation machine : machineSlots.getMachineLocations()) {
            locations.put(machine.id(), machine.location());
        }
        Map<Long, LocationRevenue> totals = new HashMap<>();
        for (Object[] row : rows) {
            MachineLocation.Location location = locations.get(((Number) row[0]).longValue());
            Long id = location != null ? location.id() : null;
            if (locationId != null && !locationId.equals(id)) continue;
            String name = location != null ? location.name() : "Chưa xác định";
            var revenue = new LocationRevenue(id, name, ((Number) row[1]).longValue(), (BigDecimal) row[2]);
            totals.merge(id, revenue, (a, b) -> new LocationRevenue(
                    id, name, a.orderCount() + b.orderCount(), a.totalRevenue().add(b.totalRevenue())));
        }
        return totals.values().stream()
                .sorted(Comparator.comparing(LocationRevenue::totalRevenue).reversed()
                        .thenComparing(LocationRevenue::locationId, Comparator.nullsLast(Comparator.naturalOrder())))
                .toList();
    }

    private BigDecimal sumDailyRevenue(Long machineId, Long productId, LocalDateTime from, LocalDateTime until) {
        return orderRepository.findDailyRevenueBetween(machineId, productId, from, until).stream()
                .map(row -> (BigDecimal) row[1]).reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private void validateDates(LocalDate from, LocalDate to) {
        if (from.isAfter(to)) throw new IllegalArgumentException("from must not be after to");
    }

    @Transactional(readOnly = true)
    public List<ProductRevenueResponse> getRevenueByProduct(Long machineId, LocalDate from, LocalDate to) {
        LocalDateTime rangeStart = (from != null ? from : LocalDate.now().minusDays(30)).atStartOfDay();
        LocalDateTime rangeEnd = (to != null ? to : LocalDate.now()).atTime(LocalTime.MAX);
        return orderRepository.findRevenueByProduct(machineId, rangeStart, rangeEnd).stream()
                .map(row -> new ProductRevenueResponse(
                        ((Number) row[0]).longValue(),
                        String.valueOf(row[1]),
                        ((Number) row[2]).longValue(),
                        row[3] instanceof BigDecimal bd ? bd : new BigDecimal(String.valueOf(row[3]))
                ))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<PeakHourRevenueResponse> getPeakHours(Long machineId, LocalDate from, LocalDate to) {
        LocalDateTime rangeStart = (from != null ? from : LocalDate.now().minusDays(30)).atStartOfDay();
        LocalDateTime rangeEnd = (to != null ? to : LocalDate.now()).atTime(LocalTime.MAX);
        return orderRepository.findPeakHoursRevenue(machineId, rangeStart, rangeEnd).stream()
                .map(row -> new PeakHourRevenueResponse(
                        ((Number) row[0]).intValue(),
                        ((Number) row[1]).longValue(),
                        row[2] instanceof BigDecimal bd ? bd : new BigDecimal(String.valueOf(row[2]))
                ))
                .toList();
    }
}
