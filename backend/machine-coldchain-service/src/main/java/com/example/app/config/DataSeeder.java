package com.example.app.config;

import com.example.app.entity.Location;
import com.example.app.entity.MachineSlot;
import com.example.app.entity.VendingMachine;
import com.example.app.repository.LocationRepository;
import com.example.app.repository.MachineSlotRepository;
import com.example.app.repository.VendingMachineRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataSeeder implements CommandLineRunner {

    private final LocationRepository locationRepository;
    private final VendingMachineRepository vendingMachineRepository;
    private final MachineSlotRepository machineSlotRepository;

    @Override
    public void run(String... args) {
        if (locationRepository.count() == 0) {
            Location location = new Location(
                    "Landmark 81",
                    "720A Điện Biên Phủ, Phường 22, Bình Thạnh",
                    "Hồ Chí Minh",
                    10.7952,
                    106.7218
            );
            Location savedLocation = locationRepository.save(location);
            log.info("✅ [DataSeeder] Đã khởi tạo địa điểm: {}", savedLocation.getName());

            if (!vendingMachineRepository.existsBySerialNumber("MC-LANDMARK-01")) {
                VendingMachine machine = new VendingMachine(
                        "MC-LANDMARK-01",
                        "FreshVend Landmark 81",
                        "FV-PRO-2026",
                        savedLocation,
                        1L,
                        new BigDecimal("2.00"),
                        new BigDecimal("8.00")
                );
                VendingMachine savedMachine = vendingMachineRepository.save(machine);
                log.info("✅ [DataSeeder] Đã khởi tạo máy bán hàng mẫu: {} (Serial: {})", savedMachine.getName(), savedMachine.getSerialNumber());

                MachineSlot slotA1 = new MachineSlot(savedMachine, "A1", 1L, 10);
                slotA1.updateStock(8);

                MachineSlot slotA2 = new MachineSlot(savedMachine, "A2", 2L, 10);
                slotA2.updateStock(5);

                MachineSlot slotB1 = new MachineSlot(savedMachine, "B1", 3L, 10);
                slotB1.updateStock(0);

                machineSlotRepository.saveAll(List.of(slotA1, slotA2, slotB1));
                log.info("✅ [DataSeeder] Đã khởi tạo 3 khay hàng mẫu: A1 (8 quả), A2 (5 quả), B1 (trống)");
            }
        }
    }
}
