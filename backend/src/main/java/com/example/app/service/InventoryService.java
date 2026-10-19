package com.example.app.service;

import com.example.app.dto.DispenseResultDTO;
import com.example.app.dto.SlotInventoryItem;
import com.example.app.entity.FruitBatch;
import com.example.app.entity.MovementType;
import com.example.app.entity.SlotBatchInventory;
import com.example.app.entity.StockMovement;
import com.example.app.exception.InsufficientStockException;
import com.example.app.exception.ResourceNotFoundException;
import com.example.app.repository.FruitBatchRepository;
import com.example.app.repository.SlotBatchInventoryRepository;
import com.example.app.repository.StockMovementRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

@Service
public class InventoryService {
    private final SlotBatchInventoryRepository slotInventory;
    private final FruitBatchRepository batches;
    private final StockMovementRepository movements;

    public InventoryService(SlotBatchInventoryRepository slotInventory, FruitBatchRepository batches,
                            StockMovementRepository movements) {
        this.slotInventory = slotInventory;
        this.batches = batches;
        this.movements = movements;
    }

    /**
     * Task 2.3: trừ kho theo FIFO (lô hết hạn sớm nhất xuất trước).
     * Lô đã quá hạn bị loại khỏi hàng đợi: không bán hàng hết hạn.
     */
    @Transactional
    public DispenseResultDTO dispenseFIFO(Long slotId, int quantityToDispense) {
        if (quantityToDispense < 1) throw new IllegalArgumentException("quantityToDispense must be >= 1");

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
        return new DispenseResultDTO(slotId, quantityToDispense, quantityToDispense, deductions);
    }

    /** Nạp một phần lô vào khay (cần để có dữ liệu tồn khay). */
    @Transactional
    public SlotInventoryItem loadToSlot(Long slotId, Long batchId, int quantity) {
        if (quantity < 1) throw new IllegalArgumentException("quantity must be >= 1");
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
        row.add(quantity);
        slotInventory.save(row);
        movements.save(new StockMovement(slotId, batch, MovementType.LOAD, quantity));
        return SlotInventoryItem.from(row);
    }

    /** Tồn kho của khay, lô hết hạn sớm nhất ở đầu. */
    @Transactional(readOnly = true)
    public List<SlotInventoryItem> getSlotInventory(Long slotId) {
        return slotInventory.findBySlotIdAndQuantityGreaterThanOrderByBatchExpiryDateAsc(slotId, 0)
                .stream().map(SlotInventoryItem::from).toList();
    }
}
