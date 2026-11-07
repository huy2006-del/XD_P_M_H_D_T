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
import com.example.app.client.MachineSlotClient.MachineRestockSlot;
import com.example.app.repository.FruitBatchRepository;
import com.example.app.repository.SlotBatchInventoryRepository;
import com.example.app.repository.StockMovementRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.Instant;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.TreeMap;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class InventoryService {
    private static final Logger log = LoggerFactory.getLogger(InventoryService.class);
    private static final ZoneId RESTOCK_BUSINESS_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final RowMapper<RestockSession> SESSION_ROW = (row, rowNum) -> {
        OffsetDateTime completedAt = row.getObject("completed_at", OffsetDateTime.class);
        return new RestockSession(row.getLong("id"), row.getString("session_code"), row.getLong("machine_id"),
                row.getObject("operator_id", UUID.class), RestockStatus.valueOf(row.getString("status")),
                row.getObject("started_at", OffsetDateTime.class).toInstant(),
                completedAt == null ? null : completedAt.toInstant(), row.getString("notes"), List.of());
    };
    private static final RowMapper<RestockItem> ITEM_ROW = (row, rowNum) -> new RestockItem(
            row.getLong("id"), row.getLong("session_id"), row.getLong("slot_id"), row.getLong("batch_id"),
            row.getInt("quantity_added"), row.getString("slot_code"), row.getString("product_name"),
            row.getString("batch_code"));

    private final SlotBatchInventoryRepository slotInventory;
    private final FruitBatchRepository batches;
    private final StockMovementRepository movements;
    private final MachineSlotClient machineSlots;
    private final NamedParameterJdbcTemplate restockJdbc;
    private final TransactionTemplate restockTransaction;

    public InventoryService(SlotBatchInventoryRepository slotInventory, FruitBatchRepository batches,
                            StockMovementRepository movements, MachineSlotClient machineSlots,
                            NamedParameterJdbcTemplate restockJdbc, PlatformTransactionManager transactionManager) {
        this.slotInventory = slotInventory;
        this.batches = batches;
        this.movements = movements;
        this.machineSlots = machineSlots;
        this.restockJdbc = restockJdbc;
        this.restockTransaction = new TransactionTemplate(transactionManager);
        this.restockTransaction.setIsolationLevel(TransactionDefinition.ISOLATION_READ_COMMITTED);
        this.restockTransaction.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
    }

    /**
     * Task 2.3: trừ kho theo FIFO (lô hết hạn sớm nhất xuất trước).
     * Lô đã quá hạn bị loại khỏi hàng đợi: không bán hàng hết hạn.
     */
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public DispenseResultDTO dispenseFIFO(Long slotId, int quantityToDispense) {
        if (quantityToDispense < 1) throw new IllegalArgumentException("quantityToDispense must be >= 1");
        slotInventory.lockSlot(slotId);
        MachineSlotInventoryResponse machineSlot = machineSlots.getSlot(slotId);
        if ("JAMMED".equals(machineSlot.status())) {
            throw new BusinessRuleException("Không thể xuất hàng vì khay đang bị kẹt.");
        }
        if (slotInventory.existsBySlotIdAndQuantityLessThan(slotId, 0)) {
            throw new BusinessRuleException("Tồn kho của khay không hợp lệ.");
        }

        LocalDate today = LocalDate.now();
        // Hai khay có thể dùng chung nhiều lô. Khóa các lô theo ID trước khi lấy hàng đợi FEFO.
        slotInventory.lockSellableBatches(slotId, today);
        // Đã khóa dòng (PESSIMISTIC_WRITE) và sắp theo hạn dùng; sort lại ở đây để thuật toán không phụ thuộc DB.
        List<SlotBatchInventory> queue = new ArrayList<>(slotInventory.lockSellableQueue(slotId, today));
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
                Math.toIntExact(slotInventory.sumQuantityBySlotId(slotId))));
        return new DispenseResultDTO(slotId, quantityToDispense, quantityToDispense, deductions);
    }

    /** Nạp một phần lô vào khay (cần để có dữ liệu tồn khay). */
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public SlotInventoryItem loadToSlot(Long slotId, Long batchId, int quantity) {
        if (quantity < 1) throw new IllegalArgumentException("quantity must be >= 1");
        slotInventory.lockSlot(slotId);
        FruitBatch batch = batches.findByIdForUpdate(batchId)
                .orElseThrow(() -> new ResourceNotFoundException("Batch", batchId));
        validateLoadBatch(slotId, batch, quantity, LocalDate.now());
        MachineSlotInventoryResponse machineSlot = machineSlots.getSlot(slotId);
        validateSlotProduct(machineSlot.productId(), batch);
        long currentStock = slotInventory.sumQuantityBySlotId(slotId);
        validateCapacity(machineSlot.capacity(), currentStock, quantity);
        SlotBatchInventory row = applyRestock(slotId, batch, quantity);
        // Gửi các thay đổi JPA xuống database trước khi gọi Machine Service, nhưng chưa commit.
        slotInventory.flush();
        // Machine Service ghi tồn trong giao dịch riêng. Rollback tại Inventory không hoàn tác được PATCH.
        machineSlots.updateStock(slotId, new MachineSlotInventoryRequest((int) (currentStock + quantity)));
        return SlotInventoryItem.from(row);
    }

    private void validateLoadBatch(long slotId, FruitBatch batch, long quantity, LocalDate today) {
        if (batch.isExpired(today)) {
            throw new BusinessRuleException("Không thể nạp lô đã hết hạn: " + batch.getBatchCode());
        }
        if (slotInventory.hasNegativeQuantityForLoad(slotId, batch.getId())) {
            throw new BusinessRuleException("Tồn kho của khay hoặc lô không hợp lệ.");
        }
        long notYetLoaded = batch.getQuantityRemaining() - slotInventory.sumQuantityByBatchId(batch.getId());
        if (quantity > notYetLoaded) {
            throw new BusinessRuleException("Lô " + batch.getBatchCode() + " chỉ còn " + Math.max(0, notYetLoaded)
                    + " sản phẩm chưa nạp vào khay.");
        }
    }

    private void validateSlotProduct(Long productId, FruitBatch batch) {
        if (productId == null) {
            throw new BusinessRuleException("Cần gán sản phẩm cho khay trước khi nạp.");
        }
        if (!productId.equals(batch.getProduct().getId())) {
            throw new BusinessRuleException("Lô hàng không khớp với sản phẩm đã gán cho khay.");
        }
    }

    private void validateCapacity(int capacity, long currentStock, long quantity) {
        if (currentStock > (long) capacity - quantity) {
            throw new BusinessRuleException("Số lượng nạp vượt quá sức chứa của khay.");
        }
    }

    private SlotBatchInventory applyRestock(long slotId, FruitBatch batch, int quantity) {
        SlotBatchInventory row = slotInventory.findBySlotIdAndBatchId(slotId, batch.getId())
                .orElseGet(() -> new SlotBatchInventory(slotId, batch, 0));
        row.add(quantity);
        slotInventory.save(row);
        movements.save(new StockMovement(slotId, batch, MovementType.RESTOCK, quantity));
        return row;
    }

    /** operatorId phải đến từ tác nhân đã được xác thực bởi bên gọi. */
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public RestockSession createRestockSession(long machineId, UUID operatorId, String notes) {
        if (machineId <= 0) throw new IllegalArgumentException("machineId must be positive");
        Objects.requireNonNull(operatorId, "operatorId");
        machineSlots.getMachineSlots(machineId);

        Instant startedAt = Instant.now();
        LocalDate businessDate = LocalDate.ofInstant(startedAt, RESTOCK_BUSINESS_ZONE);
        List<Integer> numbers = restockJdbc.query("""
                INSERT INTO restock_session_daily_counters AS counter (business_date, last_number)
                VALUES (:day, 1)
                ON CONFLICT (business_date) DO UPDATE SET last_number = counter.last_number + 1
                WHERE counter.last_number < 999
                RETURNING last_number
                """, Map.of("day", businessDate), (row, rowNum) -> row.getInt(1));
        if (numbers.isEmpty()) throw new BusinessRuleException("Đã hết mã phiên nạp cho ngày " + businessDate);
        String code = "RS-" + businessDate.format(DateTimeFormatter.BASIC_ISO_DATE)
                + String.format(Locale.ROOT, "-%03d", numbers.get(0));
        return restockJdbc.queryForObject("""
                INSERT INTO restock_sessions (session_code, machine_id, operator_id, status, started_at, notes)
                VALUES (:code, :machineId, :operatorId, 'IN_PROGRESS', :startedAt, :notes)
                RETURNING *
                """, new MapSqlParameterSource("code", code).addValue("machineId", machineId)
                .addValue("operatorId", operatorId).addValue("startedAt", startedAt.atOffset(ZoneOffset.UTC))
                .addValue("notes", notes), SESSION_ROW);
    }

    @Transactional(isolation = Isolation.READ_COMMITTED)
    public RestockItem addRestockItem(long sessionId, UUID operatorId, long slotId, long batchId, int quantity) {
        if (slotId <= 0 || batchId <= 0 || quantity <= 0) {
            throw new IllegalArgumentException("slotId, batchId and quantity must be positive");
        }
        RestockSession session = lockRestockSession(sessionId, operatorId);
        requireInProgress(session);
        MachineRestockSlot slot = requireMachineSlot(machineSlotsById(session.machineId()), slotId);
        FruitBatch batch = batches.findById(batchId)
                .orElseThrow(() -> new ResourceNotFoundException("Batch", batchId));
        validateSlotProduct(slot.productId(), batch);

        List<RestockItem> items = restockJdbc.query("""
                INSERT INTO restock_items AS item
                    (session_id, slot_id, batch_id, quantity_added, slot_code, product_name, batch_code)
                VALUES (:sessionId, :slotId, :batchId, :quantity, :slotCode, :productName, :batchCode)
                ON CONFLICT (session_id, slot_id, batch_id) DO UPDATE
                SET quantity_added = item.quantity_added + EXCLUDED.quantity_added
                WHERE CAST(item.quantity_added AS bigint) + EXCLUDED.quantity_added <= 2147483647
                RETURNING *
                """, Map.of("sessionId", sessionId, "slotId", slotId, "batchId", batchId,
                "quantity", quantity, "slotCode", slot.slotCode(), "productName", batch.getProduct().getName(),
                "batchCode", batch.getBatchCode()), ITEM_ROW);
        if (items.isEmpty()) throw new BusinessRuleException("Số lượng mục nạp vượt giới hạn.");
        return items.get(0);
    }

    public RestockCompletion completeRestockSession(long sessionId, UUID operatorId, String notes) {
        RestockSession session = Objects.requireNonNull(restockTransaction.execute(
                transaction -> completeRestockInInventory(sessionId, operatorId, notes)));
        boolean synced = true;
        for (long slotId : session.items().stream().map(RestockItem::slotId).distinct().sorted().toList()) {
