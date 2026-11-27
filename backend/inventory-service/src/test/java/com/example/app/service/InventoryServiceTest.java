package com.example.app.service;

import com.example.app.client.AuditLogClient;
import com.example.app.client.MachineSlotClient;
import com.example.app.dto.DispenseResultDTO;
import com.example.app.dto.MachineSlotInventoryRequest;
import com.example.app.dto.MachineSlotInventoryResponse;
import com.example.app.entity.FruitBatch;
import com.example.app.entity.Product;
import com.example.app.entity.SlotBatchInventory;
import com.example.app.exception.BusinessRuleException;
import com.example.app.exception.InsufficientStockException;
import com.example.app.repository.FruitBatchRepository;
import com.example.app.repository.SlotBatchInventoryRepository;
import com.example.app.repository.StockMovementRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class InventoryServiceTest {

    @Mock
    private SlotBatchInventoryRepository slotInventory;
    @Mock
    private FruitBatchRepository batches;
    @Mock
    private StockMovementRepository movements;
    @Mock
    private MachineSlotClient machineSlots;
    @Mock
    private AuditLogClient auditLogClient;

    private InventoryService inventoryService;
    private Product apple;

    @BeforeEach
    void setUp() throws Exception {
        inventoryService = new InventoryService(slotInventory, batches, movements, machineSlots, auditLogClient);
        apple = createProduct(10L, "Táo Envy", "SKU-APPLE");
    }

    private Product createProduct(Long id, String name, String sku) throws Exception {
        Product product = new Product(name, sku, BigDecimal.valueOf(35000), "quả", null,
                7, BigDecimal.valueOf(2), BigDecimal.valueOf(8), null);
        var idField = Product.class.getDeclaredField("id");
        idField.setAccessible(true);
        idField.set(product, id);
        return product;
    }

    @Test
    void dispenseFIFODeductsEarliestExpiryBatchFirstAcrossMultipleBatches() {
        FruitBatch nearExpiry = new FruitBatch(apple, "LOT-NEAR", "NCC A",
                LocalDate.now().minusDays(2), LocalDate.now().plusDays(1), 10, BigDecimal.valueOf(20000));
        FruitBatch laterExpiry = new FruitBatch(apple, "LOT-LATE", "NCC A",
                LocalDate.now().minusDays(1), LocalDate.now().plusDays(5), 10, BigDecimal.valueOf(20000));

        SlotBatchInventory slotNear = new SlotBatchInventory(1L, nearExpiry, 2);
        SlotBatchInventory slotLate = new SlotBatchInventory(1L, laterExpiry, 5);

        when(machineSlots.getSlot(1L)).thenReturn(new MachineSlotInventoryResponse(1L, 10L, 10, 7, "ACTIVE"));
        // Trả về thứ tự ngược để kiểm chứng service tự sort FEFO theo expiryDate
        when(slotInventory.lockSellableQueue(eq(1L), any(LocalDate.class))).thenReturn(List.of(slotLate, slotNear));
        when(slotInventory.sumQuantityBySlotId(1L)).thenReturn(4L);

        DispenseResultDTO result = inventoryService.dispenseFIFO(1L, 3);

        assertEquals(3, result.dispensed());
        assertEquals(0, slotNear.getQuantity());
        assertEquals(4, slotLate.getQuantity());
        assertEquals(8, nearExpiry.getQuantityRemaining());
        assertEquals(9, laterExpiry.getQuantityRemaining());
        verify(movements, times(2)).save(any());
        verify(machineSlots).updateStock(eq(1L), eq(new MachineSlotInventoryRequest(4)));
    }

    @Test
    void dispenseFIFOThrowsInsufficientStockWhenAvailableLessThanRequested() {
        FruitBatch batch = new FruitBatch(apple, "LOT-1", "NCC A",
                LocalDate.now(), LocalDate.now().plusDays(3), 10, BigDecimal.valueOf(20000));
        SlotBatchInventory slotRow = new SlotBatchInventory(1L, batch, 2);

        when(machineSlots.getSlot(1L)).thenReturn(new MachineSlotInventoryResponse(1L, 10L, 10, 2, "ACTIVE"));
        when(slotInventory.lockSellableQueue(eq(1L), any(LocalDate.class))).thenReturn(List.of(slotRow));

        assertThrows(InsufficientStockException.class, () -> inventoryService.dispenseFIFO(1L, 5));
        assertEquals(2, slotRow.getQuantity());
    }

    @Test
    void dispenseFIFOThrowsWhenSlotIsJammed() {
        when(machineSlots.getSlot(1L)).thenReturn(new MachineSlotInventoryResponse(1L, 10L, 10, 5, "JAMMED"));
        assertThrows(BusinessRuleException.class, () -> inventoryService.dispenseFIFO(1L, 1));
    }

    @Test
    void loadToSlotRejectsExpiredBatch() {
        FruitBatch expired = new FruitBatch(apple, "LOT-EXP", "NCC A",
                LocalDate.now().minusDays(10), LocalDate.now().minusDays(1), 10, BigDecimal.valueOf(20000));
        when(batches.findByIdForUpdate(5L)).thenReturn(Optional.of(expired));

        assertThrows(IllegalArgumentException.class, () -> inventoryService.loadToSlot(1L, 5L, 2));
    }

    @Test
    void loadToSlotRejectsExceedingCapacity() {
        FruitBatch valid = new FruitBatch(apple, "LOT-OK", "NCC A",
                LocalDate.now(), LocalDate.now().plusDays(4), 20, BigDecimal.valueOf(20000));
        when(batches.findByIdForUpdate(5L)).thenReturn(Optional.of(valid));
        when(slotInventory.sumQuantityByBatchId(5L)).thenReturn(0L);
        when(slotInventory.findBySlotIdAndBatchId(1L, 5L)).thenReturn(Optional.empty());
        when(machineSlots.getSlot(1L)).thenReturn(new MachineSlotInventoryResponse(1L, 10L, 10, 8, "ACTIVE"));
        when(slotInventory.sumQuantityBySlotId(1L)).thenReturn(8L);

        assertThrows(BusinessRuleException.class, () -> inventoryService.loadToSlot(1L, 5L, 5));
    }

    @Test
    void loadToSlotRejectsMismatchedProduct() throws Exception {
        Product orange = createProduct(99L, "Cam Vàng", "SKU-ORANGE");
        FruitBatch valid = new FruitBatch(orange, "LOT-ORANGE", "NCC B",
                LocalDate.now(), LocalDate.now().plusDays(4), 20, BigDecimal.valueOf(15000));
        when(batches.findByIdForUpdate(5L)).thenReturn(Optional.of(valid));
        when(slotInventory.sumQuantityByBatchId(5L)).thenReturn(0L);
        when(slotInventory.findBySlotIdAndBatchId(1L, 5L)).thenReturn(Optional.empty());
        when(machineSlots.getSlot(1L)).thenReturn(new MachineSlotInventoryResponse(1L, 10L, 10, 0, "ACTIVE"));
        when(slotInventory.sumQuantityBySlotId(1L)).thenReturn(0L);

        assertThrows(BusinessRuleException.class, () -> inventoryService.loadToSlot(1L, 5L, 2));
    }
}
