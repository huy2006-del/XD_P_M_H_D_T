package com.example.app.service;

import com.example.app.dto.SpoilageReportResponse;
import com.example.app.entity.FruitBatch;
import com.example.app.entity.Order;
import com.example.app.repository.FruitBatchRepository;
import com.example.app.repository.OrderRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.StringWriter;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class ReportService {

    private final OrderRepository orderRepository;
    private final FruitBatchRepository fruitBatchRepository;

    @Transactional(readOnly = true)
    public SpoilageReportResponse getSpoilageReport(String search, String supplier) {
        LocalDate today = LocalDate.now();
        List<FruitBatch> expiredBatches = fruitBatchRepository.findExpiredBatchesWithRemainingStock(today);

        String normalizedSearch = search != null ? search.trim().toLowerCase() : "";
        String normalizedSupplier = supplier != null ? supplier.trim().toLowerCase() : "";

        List<SpoilageReportResponse.BatchItem> items = new ArrayList<>();
        BigDecimal totalLossAmount = BigDecimal.ZERO;
        long totalSpoiledQuantity = 0;
        long totalImportedAcrossExpired = 0;

        Map<String, ProductAccumulator> grouped = new LinkedHashMap<>();

        for (FruitBatch batch : expiredBatches) {
            if (batch.getQuantityRemaining() <= 0) {
                continue;
            }
            String productName = batch.getProduct().getName();
            String supplierName = batch.getSupplier() != null && !batch.getSupplier().isBlank()
                    ? batch.getSupplier()
                    : "Chưa cập nhật";

            if (!normalizedSearch.isEmpty()) {
                boolean matches = batch.getBatchCode().toLowerCase().contains(normalizedSearch)
                        || productName.toLowerCase().contains(normalizedSearch)
                        || supplierName.toLowerCase().contains(normalizedSearch);
                if (!matches) {
                    continue;
                }
            }
            if (!normalizedSupplier.isEmpty() && !supplierName.toLowerCase().contains(normalizedSupplier)) {
                continue;
            }

            int spoiledQty = batch.getQuantityRemaining();
            int importedQty = batch.getQuantityImported();
            BigDecimal unitCost = batch.getUnitCost() != null ? batch.getUnitCost() : BigDecimal.ZERO;
            BigDecimal batchLoss = unitCost.multiply(BigDecimal.valueOf(spoiledQty));
            double rate = importedQty > 0 ? round2((spoiledQty * 100.0) / importedQty) : 0.0;
            long daysOverdue = Math.max(0L, ChronoUnit.DAYS.between(batch.getExpiryDate(), today));

            items.add(new SpoilageReportResponse.BatchItem(
                    batch.getId(),
                    batch.getProduct().getId(),
                    productName,
                    batch.getBatchCode(),
                    supplierName,
                    batch.getImportDate(),
                    batch.getExpiryDate(),
                    importedQty,
                    spoiledQty,
                    unitCost,
                    batchLoss,
                    rate,
                    daysOverdue
            ));

            totalLossAmount = totalLossAmount.add(batchLoss);
            totalSpoiledQuantity += spoiledQty;
            totalImportedAcrossExpired += importedQty;

            ProductAccumulator acc = grouped.computeIfAbsent(productName, k -> new ProductAccumulator());
            acc.spoiledQty += spoiledQty;
            acc.importedQty += importedQty;
            acc.totalLoss = acc.totalLoss.add(batchLoss);
        }

        double averageRate = totalImportedAcrossExpired > 0
                ? round2((totalSpoiledQuantity * 100.0) / totalImportedAcrossExpired)
                : 0.0;

        List<SpoilageReportResponse.ProductDistribution> distribution = grouped.entrySet().stream()
                .map(entry -> {
                    ProductAccumulator acc = entry.getValue();
                    double lossRate = acc.importedQty > 0 ? round2((acc.spoiledQty * 100.0) / acc.importedQty) : 0.0;
                    return new SpoilageReportResponse.ProductDistribution(
                            entry.getKey(),
                            acc.spoiledQty,
                            acc.totalLoss,
                            lossRate
                    );
                })
                .toList();

        return new SpoilageReportResponse(
                new SpoilageReportResponse.Summary(
                        totalLossAmount,
                        totalSpoiledQuantity,
                        items.size(),
                        averageRate
                ),
                items,
                distribution
        );
    }

    @Transactional(readOnly = true)
    public String exportOrderCsv(LocalDate fromDate, LocalDate toDate) {
        return exportOrderCsv(fromDate, toDate, null);
    }

    @Transactional(readOnly = true)
    public String exportOrderCsv(LocalDate fromDate, LocalDate toDate, Long machineId) {
        LocalDateTime from = (fromDate != null) ? fromDate.atStartOfDay() : LocalDate.now().minusDays(30).atStartOfDay();
        LocalDateTime to = (toDate != null) ? toDate.atTime(LocalTime.MAX) : LocalDateTime.now();

        List<Order> orders = machineId != null
                ? orderRepository.findByMachineIdAndCreatedAtBetweenOrderByCreatedAtDesc(machineId, from, to)
                : orderRepository.findByCreatedAtBetweenOrderByCreatedAtDesc(from, to);

        StringWriter writer = new StringWriter();
        // Ghi UTF-8 BOM để Excel không lỗi font tiếng Việt
        writer.write("\uFEFF");

        // Header CSV
        writer.write("Mã Đơn Hàng,Mã Máy,Tổng Tiền (VND),Phương Thức,Thanh Toán,Nhả Hàng,Ngày Tạo\r\n");

        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

        for (Order order : orders) {
            writer.write(String.format("%s,%s,%s,%s,%s,%s,%s\r\n",
                    escapeCsv(order.getOrderCode()),
                    escapeCsv(order.getMachineId() != null ? String.valueOf(order.getMachineId()) : ""),
                    escapeCsv(order.getTotalAmount() != null ? order.getTotalAmount().toPlainString() : "0"),
                    escapeCsv(order.getPaymentMethod() != null ? order.getPaymentMethod().name() : ""),
                    escapeCsv(order.getPaymentStatus() != null ? order.getPaymentStatus().name() : ""),
                    escapeCsv(order.getDispenseStatus() != null ? order.getDispenseStatus().name() : ""),
                    escapeCsv(order.getCreatedAt() != null ? order.getCreatedAt().format(formatter) : "")
            ));
        }

        return writer.toString();
    }

    private double round2(double value) {
        return Math.round(value * 100.0) / 100.0;
    }

    private String escapeCsv(String data) {
        if (data == null) return "";
        if (data.contains(",") || data.contains("\"") || data.contains("\n") || data.contains("\r")) {
            data = data.replace("\"", "\"\"");
            return "\"" + data + "\"";
        }
        return data;
    }

    private static class ProductAccumulator {
        long spoiledQty = 0;
        long importedQty = 0;
        BigDecimal totalLoss = BigDecimal.ZERO;
    }
}
