package com.example.app.config;

import com.example.app.entity.FruitBatch;
import com.example.app.entity.Product;
import com.example.app.entity.SlotBatchInventory;
import com.example.app.repository.FruitBatchRepository;
import com.example.app.repository.ProductRepository;
import com.example.app.repository.SlotBatchInventoryRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataSeeder implements CommandLineRunner {

    private final ProductRepository productRepository;
    private final FruitBatchRepository fruitBatchRepository;
    private final SlotBatchInventoryRepository slotBatchInventoryRepository;

    @Override
    @Transactional
    public void run(String... args) {
        if (productRepository.count() == 0) {
            Product apple = productRepository.save(new Product(
                    "Táo Envy New Zealand",
                    "APPLE-ENVY-01",
                    new BigDecimal("35000.00"),
                    "quả",
                    "/fruits/apple.png",
                    7,
                    new BigDecimal("2.00"),
                    new BigDecimal("8.00"),
                    "Táo Envy giòn ngọt, bảo quản chuỗi lạnh 2°C - 8°C."
            ));

            Product orange = productRepository.save(new Product(
                    "Cam Vàng Navel Úc",
                    "ORANGE-NAVEL-02",
                    new BigDecimal("28000.00"),
                    "quả",
                    "/fruits/orange.png",
                    5,
                    new BigDecimal("2.00"),
                    new BigDecimal("8.00"),
                    "Cam vàng mọng nước, giàu vitamin C."
            ));

            Product pear = productRepository.save(new Product(
                    "Lê Hàn Quốc Thượng Hạng",
                    "PEAR-KR-03",
                    new BigDecimal("42000.00"),
                    "quả",
                    "/fruits/pear.png",
                    6,
                    new BigDecimal("2.00"),
                    new BigDecimal("8.00"),
                    "Lê Hàn Quốc thanh mát, cắt sẵn hoặc nguyên quả."
            ));

            log.info("✅ [Inventory DataSeeder] Đã khởi tạo 3 sản phẩm mẫu: {}, {}, {}",
                    apple.getName(), orange.getName(), pear.getName());

            if (fruitBatchRepository.count() == 0) {
                LocalDate today = LocalDate.now();
                FruitBatch appleBatch1 = fruitBatchRepository.save(new FruitBatch(
                        apple,
                        "LOT-APPLE-FEFO-01",
                        "Nông trại BioFresh Đà Lạt",
                        today.minusDays(2),
                        today.plusDays(2),
                        20,
                        new BigDecimal("22000.00")
                ));
                FruitBatch appleBatch2 = fruitBatchRepository.save(new FruitBatch(
                        apple,
                        "LOT-APPLE-FEFO-02",
                        "Nông trại BioFresh Đà Lạt",
                        today.minusDays(1),
                        today.plusDays(6),
                        30,
                        new BigDecimal("22000.00")
                ));
                FruitBatch orangeBatch = fruitBatchRepository.save(new FruitBatch(
                        orange,
                        "LOT-ORANGE-01",
                        "VinEco Nông Sản Sạch",
                        today.minusDays(1),
                        today.plusDays(5),
                        25,
                        new BigDecimal("18000.00")
                ));
                FruitBatch pearBatch = fruitBatchRepository.save(new FruitBatch(
                        pear,
                        "LOT-PEAR-01",
                        "K-Fruit Import",
                        today,
                        today.plusDays(7),
                        20,
                        new BigDecimal("27000.00")
                ));
                FruitBatch expiredBatch = fruitBatchRepository.save(new FruitBatch(
                        orange,
                        "LOT-EXP-DEMO-01",
                        "Nông trại Đà Lạt Farm",
                        today.minusDays(10),
                        today.minusDays(2),
                        6,
                        new BigDecimal("18000.00")
                ));

                // Khớp tồn kho khay mẫu với Machine DataSeeder: Khay #1 (A1: 8 quả Táo), Khay #2 (A2: 5 quả Cam)
                if (slotBatchInventoryRepository.count() == 0) {
                    slotBatchInventoryRepository.save(new SlotBatchInventory(1L, appleBatch1, 3));
                    slotBatchInventoryRepository.save(new SlotBatchInventory(1L, appleBatch2, 5));
                    slotBatchInventoryRepository.save(new SlotBatchInventory(2L, orangeBatch, 5));
                }

                log.info("✅ [Inventory DataSeeder] Đã khởi tạo các lô hàng FEFO mẫu (kèm 1 lô quá hạn {}) và tồn kho khay #1, #2.",
                        expiredBatch.getBatchCode());
            }
        }
    }
}
