package com.example.app.service;

import com.example.app.dto.SpoilageReportResponse;
import com.example.app.entity.DispenseStatus;
import com.example.app.entity.FruitBatch;
import com.example.app.entity.Order;
import com.example.app.entity.PaymentMethod;
import com.example.app.entity.PaymentStatus;
import com.example.app.entity.Product;
import com.example.app.repository.FruitBatchRepository;
import com.example.app.repository.OrderRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ReportServiceTest {

    @Mock
    private OrderRepository orderRepository;
    @Mock
    private FruitBatchRepository fruitBatchRepository;

    private ReportService reportService;

    @BeforeEach
    void setUp() {
        reportService = new ReportService(orderRepository, fruitBatchRepository);
    }

    @Test
    void getSpoilageReportCalculatesExactLossesAndExcludesZeroRemaining() throws Exception {
        Product apple = createProduct(1L, "Táo Envy", "SKU-APPLE");
        Product grape = createProduct(2L, "Nho Mẫu Đơn", "SKU-GRAPE");

        FruitBatch batch1 = new FruitBatch(apple, "LOT-EXP-01", "BioFresh",
                LocalDate.now().minusDays(10), LocalDate.now().minusDays(2), 10, BigDecimal.valueOf(20000));
        batch1.deduct(6); // Còn 4 quả hỏng -> 4 * 20,000 = 80,000

        FruitBatch batch2 = new FruitBatch(grape, "LOT-EXP-02", "VinEco",
                LocalDate.now().minusDays(8), LocalDate.now().minusDays(1), 5, BigDecimal.valueOf(30000));
        // Còn 5 quả hỏng -> 5 * 30,000 = 150,000

        FruitBatch batchSoldOut = new FruitBatch(apple, "LOT-EXP-03", "BioFresh",
                LocalDate.now().minusDays(12), LocalDate.now().minusDays(3), 10, BigDecimal.valueOf(20000));
        batchSoldOut.deduct(10); // Còn 0 -> phải bị loại

        when(fruitBatchRepository.findExpiredBatchesWithRemainingStock(any(LocalDate.class)))
                .thenReturn(List.of(batch1, batch2, batchSoldOut));

        SpoilageReportResponse report = reportService.getSpoilageReport(null, null);

        assertEquals(2, report.summary().totalBatchesExpired());
        assertEquals(9L, report.summary().totalSpoiledQuantity());
        assertEquals(0, BigDecimal.valueOf(230000).compareTo(report.summary().totalLossAmount()));
        assertEquals(60.0, report.summary().averageSpoilageRate()); // 9 / (10 + 5) * 100 = 60%
        assertEquals(2, report.batches().size());
        assertEquals(2, report.distribution().size());
    }

    @Test
    void exportOrderCsvIncludesUtf8BomAndAllColumns() {
        Order order = Order.builder()
                .orderCode("ORD-20261126-0001")
                .machineId(1L)
                .totalAmount(BigDecimal.valueOf(45000))
                .paymentMethod(PaymentMethod.VIETQR)
                .paymentStatus(PaymentStatus.SUCCESS)
                .dispenseStatus(DispenseStatus.COMPLETED)
                .createdAt(LocalDateTime.of(2026, 11, 26, 10, 30, 0))
                .build();

        when(orderRepository.findByCreatedAtBetweenOrderByCreatedAtDesc(any(), any()))
                .thenReturn(List.of(order));

        String csv = reportService.exportOrderCsv(LocalDate.of(2026, 11, 1), LocalDate.of(2026, 11, 26), null);

        assertTrue(csv.startsWith("\uFEFF"));
        assertTrue(csv.contains("Mã Đơn Hàng,Mã Máy,Tổng Tiền (VND),Phương Thức,Thanh Toán,Nhả Hàng,Ngày Tạo"));
        assertTrue(csv.contains("ORD-20261126-0001,1,45000,VIETQR,SUCCESS,COMPLETED,2026-11-26 10:30:00"));
    }

    private Product createProduct(Long id, String name, String sku) throws Exception {
        Product product = new Product(name, sku, BigDecimal.valueOf(35000), "quả", null,
                7, BigDecimal.valueOf(2), BigDecimal.valueOf(8), null);
        var idField = Product.class.getDeclaredField("id");
        idField.setAccessible(true);
        idField.set(product, id);
        return product;
    }
}
