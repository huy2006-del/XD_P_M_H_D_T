package com.example.app.service.impl;

import com.example.app.client.AuditLogClient;
import com.example.app.client.InventoryHistoryClient;
import com.example.app.client.ProductClient;
import com.example.app.dto.ProductDTO;
import com.example.app.dto.event.AuditLogEvent;
import com.example.app.dto.request.MachineRequest;
import com.example.app.dto.request.MachineSlotRequest;
import com.example.app.dto.response.MachineResponse;
import com.example.app.dto.response.MachineSlotResponse;
import com.example.app.dto.response.TemperatureLogResponse;
import com.example.app.entity.Location;
import com.example.app.entity.MachineSlot;
import com.example.app.entity.MachineStatus;
import com.example.app.entity.TemperatureLog;
import com.example.app.entity.VendingMachine;
import com.example.app.exception.BusinessRuleException;
import com.example.app.repository.LocationRepository;
import com.example.app.repository.MachineSlotRepository;
import com.example.app.repository.TemperatureLogRepository;
import com.example.app.repository.VendingMachineRepository;
import com.example.app.service.AlertService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.math.BigDecimal;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MachineAndTelemetryServiceTest {

    @Mock
    private VendingMachineRepository vendingMachineRepository;
    @Mock
    private LocationRepository locationRepository;
    @Mock
    private TemperatureLogRepository temperatureLogRepository;
    @Mock
    private MachineSlotRepository machineSlotRepository;
    @Mock
    private ProductClient productClient;
    @Mock
    private InventoryHistoryClient inventoryHistoryClient;
    @Mock
    private AuditLogClient auditLogClient;
    @Mock
    private AlertService alertService;
    @Mock
    private SimpMessagingTemplate messagingTemplate;

    private VendingMachineServiceImpl vendingMachineService;
    private MachineSlotServiceImpl machineSlotService;
    private TelemetryServiceImpl telemetryService;

    @BeforeEach
    void setUp() {
        vendingMachineService = new VendingMachineServiceImpl(
                vendingMachineRepository, locationRepository, temperatureLogRepository, auditLogClient
        );
        machineSlotService = new MachineSlotServiceImpl(
                machineSlotRepository, vendingMachineRepository, productClient, inventoryHistoryClient, auditLogClient
        );
        telemetryService = new TelemetryServiceImpl(
                vendingMachineRepository, temperatureLogRepository, alertService, messagingTemplate
        );
    }

    @Test
    void createAndUpdateMachineValidatesThresholdsLogsAuditAndChangesStatus() {
        Location location = new Location("Trạm Bến Thành", "Q1, TP.HCM", "Hồ Chí Minh", 10.77, 106.69);
        when(locationRepository.findById(1L)).thenReturn(Optional.of(location));

        // 1. Kiểm tra chặn ngưỡng nhiệt độ không hợp lệ (min >= max)
        MachineRequest invalidRequest = new MachineRequest(
                "FV-HCM-101", "Kiosk Bến Thành", "FV-2026", 1L, 10L,
                new BigDecimal("8.00"), new BigDecimal("2.00")
        );
        when(vendingMachineRepository.existsBySerialNumber("FV-HCM-101")).thenReturn(false);
        assertThrows(BusinessRuleException.class, () -> vendingMachineService.create(invalidRequest));

        // 2. Tạo máy hợp lệ
        MachineRequest createRequest = new MachineRequest(
                "FV-HCM-101", "Kiosk Bến Thành", "FV-2026", 1L, 10L,
                new BigDecimal("2.00"), new BigDecimal("8.00")
        );
        when(vendingMachineRepository.save(any(VendingMachine.class))).thenAnswer(inv -> inv.getArgument(0));
        when(temperatureLogRepository.findTopByMachineIdOrderByRecordedAtDescIdDesc(any())).thenReturn(Optional.empty());

        MachineResponse created = vendingMachineService.create(createRequest);
        assertEquals("FV-HCM-101", created.serialNumber());
        assertEquals("ONLINE", created.status());

        // 3. Cập nhật đổi ngưỡng nhiệt độ -> ghi Audit Log THRESHOLD_UPDATED
        VendingMachine existingMachine = new VendingMachine(
                "FV-HCM-101", "Kiosk Bến Thành", "FV-2026", location, 10L,
                new BigDecimal("2.00"), new BigDecimal("8.00")
        );
        when(vendingMachineRepository.findById(101L)).thenReturn(Optional.of(existingMachine));
        when(vendingMachineRepository.existsBySerialNumberAndIdNot("FV-HCM-101", 101L)).thenReturn(false);

        MachineRequest updateRequest = new MachineRequest(
                "FV-HCM-101", "Kiosk Bến Thành Mới", "FV-2026", 1L, 10L,
                new BigDecimal("1.50"), new BigDecimal("7.50")
        );
        MachineResponse updated = vendingMachineService.update(101L, updateRequest);
        assertEquals(new BigDecimal("1.50"), updated.tempMinThreshold());
        assertEquals(new BigDecimal("7.50"), updated.tempMaxThreshold());

        ArgumentCaptor<AuditLogEvent> auditCaptor = ArgumentCaptor.forClass(AuditLogEvent.class);
        verify(auditLogClient).recordAuditLog(auditCaptor.capture());
        assertEquals("THRESHOLD_UPDATED", auditCaptor.getValue().action());
        assertTrue(auditCaptor.getValue().details().contains("FV-HCM-101"));

        // 4. Đổi trạng thái máy: ONLINE -> MAINTENANCE -> OUT_OF_ORDER -> ONLINE
        assertEquals("MAINTENANCE", vendingMachineService.updateStatus(101L, MachineStatus.MAINTENANCE).status());
        assertEquals("OUT_OF_ORDER", vendingMachineService.updateStatus(101L, MachineStatus.OUT_OF_ORDER).status());
        assertEquals("ONLINE", vendingMachineService.updateStatus(101L, MachineStatus.ONLINE).status());
    }

    @Test
    void machineSlotConfigurationBlocksProductSwitchWithStockAndCapacityBelowCurrentStock() {
        Location location = new Location("Trạm Thảo Điền", "Q2, TP.HCM", "Hồ Chí Minh", 10.80, 106.73);
        VendingMachine machine = new VendingMachine("FV-HCM-102", "Kiosk Thảo Điền", "FV-2026", location, 10L);
        MachineSlot slot = new MachineSlot(machine, "A1", 1L, 10);
        slot.updateStock(5); // Tồn kho hiện tại = 5

        when(machineSlotRepository.findById(50L)).thenReturn(Optional.of(slot));
        when(machineSlotRepository.existsByMachineIdAndSlotCodeIgnoreCaseAndIdNot(any(), eq("A1"), eq(50L)))
                .thenReturn(false);

        ProductDTO product1 = new ProductDTO("1", "Táo Envy", new BigDecimal("45000"), "/apple.png", true);
        ProductDTO product2 = new ProductDTO("2", "Nho Mẫu Đơn", new BigDecimal("95000"), "/grape.png", true);
        when(productClient.getById(1L)).thenReturn(product1);
        when(productClient.getById(2L)).thenReturn(product2);

        // 1. Chặn đổi sản phẩm khi khay còn tồn kho (currentStock = 5 > 0)
        MachineSlotRequest switchProductReq = new MachineSlotRequest("A1", 2L, 10);
        BusinessRuleException switchEx = assertThrows(BusinessRuleException.class,
                () -> machineSlotService.updateMachineSlot(50L, switchProductReq));
        assertTrue(switchEx.getMessage().contains("còn tồn kho"));

        // 2. Chặn giảm capacity < currentStock (capacity = 4 < 5)
        MachineSlotRequest reduceCapacityReq = new MachineSlotRequest("A1", 1L, 4);
        BusinessRuleException capEx = assertThrows(BusinessRuleException.class,
                () -> machineSlotService.updateMachineSlot(50L, reduceCapacityReq));
        assertTrue(capEx.getMessage().contains("nhỏ hơn tồn kho"));

        // 3. Cho phép cập nhật hợp lệ khi giữ nguyên sản phẩm và capacity >= currentStock
        when(machineSlotRepository.save(any(MachineSlot.class))).thenAnswer(inv -> inv.getArgument(0));
        MachineSlotRequest validUpdateReq = new MachineSlotRequest("A1", 1L, 12);
        MachineSlotResponse response = machineSlotService.updateMachineSlot(50L, validUpdateReq);
        assertEquals(12, response.capacity());
        assertEquals(1L, response.productId());
    }

    @Test
    void recordTemperatureBroadcastsWebSocketAndTriggersAlertEvaluation() {
        Location location = new Location("Trạm Quận 3", "Q3, TP.HCM", "Hồ Chí Minh", 10.78, 106.68);
        VendingMachine machine = new VendingMachine("FV-HCM-103", "Kiosk Quận 3", "FV-2026", location, 10L);
        when(vendingMachineRepository.findById(25L)).thenReturn(Optional.of(machine));
        when(vendingMachineRepository.save(any(VendingMachine.class))).thenAnswer(inv -> inv.getArgument(0));
        when(temperatureLogRepository.save(any(TemperatureLog.class))).thenAnswer(inv -> inv.getArgument(0));

        TemperatureLogResponse response = telemetryService.recordTemperature(25L, 13.5, 84.0);

        assertNotNull(response);
        assertEquals(13.5, response.temperature());
        assertEquals(84.0, response.humidity());
        assertNotNull(machine.getLastPingAt());
        verify(alertService).evaluateTemperature(machine, 13.5, true);
        verify(messagingTemplate).convertAndSend(eq("/topic/telemetry/25"), any(TemperatureLogResponse.class));
    }
}
