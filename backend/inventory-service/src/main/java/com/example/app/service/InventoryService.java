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
