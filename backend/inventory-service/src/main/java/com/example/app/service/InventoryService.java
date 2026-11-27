package com.example.app.service;

import com.example.app.dto.DispenseResultDTO;
import com.example.app.dto.MachineSlotInventoryRequest;
import com.example.app.dto.MachineSlotInventoryResponse;
import com.example.app.dto.SlotInventoryItem;
import com.example.app.entity.FruitBatch;
import com.example.app.entity.MovementType;
import com.example.app.entity.SlotBatchInventory;
import com.example.app.entity.StockMovement;
import com.example.app.exception.InsufficientStockException;
import com.example.app.exception.BusinessRuleException;
import com.example.app.exception.ResourceNotFoundException;
import com.example.app.client.MachineSlotClient;
import com.example.app.client.AuditLogClient;
import com.example.app.dto.AuditLogEvent;
import com.example.app.repository.FruitBatchRepository;
import com.example.app.repository.SlotBatchInventoryRepository;
import com.example.app.repository.StockMovementRepository;
import org.springframework.stereotype.Service;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.annotation.Transactional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class InventoryService {
    private static final Logger log = LoggerFactory.getLogger(InventoryService.class);
    private final SlotBatchInventoryRepository slotInventory;
    private final FruitBatchRepository batches;
    private final StockMovementRepository movements;
    private final MachineSlotClient machineSlots;
    private final AuditLogClient auditLogClient;

    public InventoryService(SlotBatchInventoryRepository slotInventory, FruitBatchRepository batches,
                            StockMovementRepository movements, MachineSlotClient machineSlots,
                            AuditLogClient auditLogClient) {
        this.slotInventory = slotInventory;
        this.batches = batches;
        this.movements = movements;
        this.machineSlots = machineSlots;
        this.auditLogClient = auditLogClient;
    }

    /**
     * Task 2.3: trừ kho theo FIFO (lô hết hạn sớm nhất xuất trước).
     * Lô đã quá hạn bị loại khỏi hàng đợi: không bán hàng hết hạn.
     */
    @Transactional
    public DispenseResultDTO dispenseFIFO(Long slotId, int quantityToDispense) {
        if (quantityToDispense < 1) throw new IllegalArgumentException("quantityToDispense must be >= 1");
        slotInventory.lockSlot(slotId);
        MachineSlotInventoryResponse machineSlot = machineSlots.getSlot(slotId);
        if ("JAMMED".equals(machineSlot.status())) {
            throw new BusinessRuleException("Không thể xuất hàng vì khay đang bị kẹt.");
        }

        // Đã khóa dòng (PESSIMISTIC_WRITE) và sắp theo hạn dùng; sort lại ở đây để thuật toán không phụ thuộc DB.
        List<SlotBatchInventory> queue = new ArrayList<>(slotInventory.lockSellableQueue(slotId, LocalDate.now()));
        queue.sort(Comparator
                .comparing((SlotBatchInventory s) -> s.getBatch().getExpiryDate())
                .thenComparing(SlotBatchInventory::getId, Comparator.nullsLast(Comparator.naturalOrder())));

        // Bước 1: đủ hàng không?
        long available = queue.stream().mapToLong(SlotBatchInventory::getQuantity).sum();
        if (available < quantityToDispense) {
            throw new InsufficientStockException(slotId, quantityToDispense, available);
        }

        // Bước 2-3: trừ dần từng lô, thiếu thì sang lô kế tiếp.
        int remaining = quantityToDispense;
        List<DispenseResultDTO.BatchDeduction> deductions = new ArrayList<>();
        for (SlotBatchInventory row : queue) {
            if (remaining == 0) break;
            int take = Math.min(remaining, row.getQuantity());
            FruitBatch batch = row.getBatch();

            row.remove(take);          // tồn của lô trong khay
            batch.deduct(take);        // tồn còn lại của cả lô

            // Bước 4: ghi lịch sử xuất kho
            movements.save(new StockMovement(slotId, batch, MovementType.DISPENSE, take));
            deductions.add(new DispenseResultDTO.BatchDeduction(
                    batch.getId(), batch.getBatchCode(), batch.getExpiryDate(), take));
            remaining -= take;
        }
        machineSlots.updateStock(slotId, new MachineSlotInventoryRequest(
                (int) slotInventory.sumQuantityBySlotId(slotId)));
        return new DispenseResultDTO(slotId, quantityToDispense, quantityToDispense, deductions);
    }

    /** Nạp một phần lô vào khay (cần để có dữ liệu tồn khay). */
    @Transactional
    public SlotInventoryItem loadToSlot(Long slotId, Long batchId, int quantity) {
        if (quantity < 1) throw new IllegalArgumentException("quantity must be >= 1");
        slotInventory.lockSlot(slotId);
        FruitBatch batch = batches.findByIdForUpdate(batchId)
                .orElseThrow(() -> new ResourceNotFoundException("Batch", batchId));
        if (batch.isExpired(LocalDate.now())) {
            throw new IllegalArgumentException("Cannot load an expired batch: " + batch.getBatchCode());
        }
        long notYetLoaded = batch.getQuantityRemaining() - slotInventory.sumQuantityByBatchId(batchId);
        if (quantity > notYetLoaded) {
            throw new IllegalArgumentException("Batch " + batch.getBatchCode() + " only has " + notYetLoaded
                    + " items not yet loaded into slots");
        }
        SlotBatchInventory row = slotInventory.findBySlotIdAndBatchId(slotId, batchId)
                .orElseGet(() -> new SlotBatchInventory(slotId, batch, 0));
        MachineSlotInventoryResponse machineSlot = machineSlots.getSlot(slotId);
        long stockAfterLoad = slotInventory.sumQuantityBySlotId(slotId) + quantity;
        if ("JAMMED".equals(machineSlot.status())) {
            throw new BusinessRuleException("Không thể nạp hàng vào khay đang bị kẹt.");
        }
        if (stockAfterLoad > machineSlot.capacity()) {
            throw new BusinessRuleException("Số lượng nạp vượt quá sức chứa của khay.");
        }
        if (machineSlot.productId() != null
                && !machineSlot.productId().equals(batch.getProduct().getId())) {
            throw new BusinessRuleException("Lô hàng không khớp với sản phẩm đã gán cho khay.");
        }
        row.add(quantity);
        slotInventory.save(row);
        movements.save(new StockMovement(slotId, batch, MovementType.LOAD, quantity));
        machineSlots.updateStock(slotId, new MachineSlotInventoryRequest((int) stockAfterLoad));
        SlotInventoryItem loadedItem = SlotInventoryItem.from(row);
        recordRestockAudit(slotId, batch, quantity);
        return loadedItem;
    }

    /** Tồn kho của khay, lô hết hạn sớm nhất ở đầu. */
    @Transactional(readOnly = true)
    public List<SlotInventoryItem> getSlotInventory(Long slotId) {
        return slotInventory.findBySlotIdAndQuantityGreaterThanOrderByBatchExpiryDateAsc(slotId, 0)
                .stream().map(SlotInventoryItem::from).toList();
    }

    public record SlotSummary(Long slotId, Long productId, int capacity, String status,
                              long quantity, long sellableQuantity, long expiredQuantity,
                              List<SlotInventoryItem> batches) {}

    @Transactional(readOnly = true)
    public SlotSummary getSlotSummary(Long slotId) {
        return summarize(machineSlots.getSlot(slotId), getSlotInventory(slotId), LocalDate.now());
    }

    @Transactional(readOnly = true)
    public List<SlotSummary> getMachineInventory(Long machineId, Integer maxSellableQuantity) {
        if (maxSellableQuantity != null && maxSellableQuantity < 0) {
            throw new IllegalArgumentException("maxSellableQuantity must be >= 0");
        }
        List<MachineSlotInventoryResponse> slots = machineSlots.getMachineSlots(machineId);
        if (slots.isEmpty()) return List.of();
        List<Long> ids = slots.stream().map(MachineSlotInventoryResponse::slotId).toList();
        Map<Long, List<SlotInventoryItem>> bySlot = slotInventory
                .findBySlotIdInAndQuantityGreaterThanOrderByBatchExpiryDateAscIdAsc(ids, 0)
                .stream()
                .collect(Collectors.groupingBy(SlotBatchInventory::getSlotId,
                        Collectors.mapping(SlotInventoryItem::from, Collectors.toList())));
        LocalDate today = LocalDate.now();
        return slots.stream()
                .map(slot -> summarize(slot, bySlot.getOrDefault(slot.slotId(), List.of()), today))
                .filter(slot -> maxSellableQuantity == null || slot.sellableQuantity() <= maxSellableQuantity)
                .toList();
    }

    private SlotSummary summarize(MachineSlotInventoryResponse slot, List<SlotInventoryItem> batches, LocalDate today) {
        long quantity = batches.stream().mapToLong(SlotInventoryItem::quantity).sum();
        long expired = batches.stream().filter(batch -> batch.expiryDate().isBefore(today))
                .mapToLong(SlotInventoryItem::quantity).sum();
        return new SlotSummary(slot.slotId(), slot.productId(), slot.capacity(), slot.status(),
                quantity, quantity - expired, expired, batches);
    }

    private void recordRestockAudit(Long slotId, FruitBatch batch, int quantity) {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            String username = authentication != null && authentication.isAuthenticated()
                    && authentication.getName() != null && !authentication.getName().isBlank()
                    && !"anonymousUser".equals(authentication.getName())
                    ? authentication.getName() : "operator_admin";
            AuditLogEvent event = new AuditLogEvent("RESTOCK_COMPLETED", null, username,
                    "Nạp " + quantity + " sản phẩm từ lô " + batch.getBatchCode()
                            + " vào khay ID " + slotId);
            auditLogClient.recordAuditLog(event);
        } catch (RuntimeException exception) {
            log.warn("Không ghi được audit RESTOCK_COMPLETED qua identity-service; nghiệp vụ chính vẫn tiếp tục.",
                    exception);
        }
    }
}
