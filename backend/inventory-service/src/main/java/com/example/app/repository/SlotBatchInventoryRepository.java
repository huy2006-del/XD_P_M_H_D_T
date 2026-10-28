package com.example.app.repository;

import com.example.app.entity.FruitBatch;
import com.example.app.entity.SlotBatchInventory;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface SlotBatchInventoryRepository extends JpaRepository<SlotBatchInventory, Long> {

    // Khóa theo ID khay, kể cả khi chưa có dòng tồn kho. PostgreSQL tự nhả khóa khi giao dịch kết thúc.
    @Transactional(propagation = Propagation.MANDATORY)
    @Query(value = "select 1 from pg_advisory_xact_lock(cast(:slotId as bigint))", nativeQuery = true)
    void lockSlot(@Param("slotId") Long slotId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select b from FruitBatch b where b.expiryDate >= :today and b.id in "
            + "(select s.batch.id from SlotBatchInventory s where s.slotId = :slotId and s.quantity > 0) "
            + "order by b.id asc")
    List<FruitBatch> lockSellableBatches(@Param("slotId") Long slotId, @Param("today") LocalDate today);

    /** Task 2.1: các lô trong khay, hạn dùng gần nhất lên đầu. */
    List<SlotBatchInventory> findBySlotIdAndQuantityGreaterThanOrderByBatchExpiryDateAsc(Long slotId, int minQty);

    /**
     * Hàng đợi FIFO dùng khi trừ kho: khóa dòng (chống 2 giao dịch trừ trùng), chỉ lấy lô còn hạn và còn hàng.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select s from SlotBatchInventory s join fetch s.batch b "
            + "where s.slotId = :slotId and s.quantity > 0 and b.expiryDate >= :today "
            + "order by b.expiryDate asc, s.id asc")
    List<SlotBatchInventory> lockSellableQueue(@Param("slotId") Long slotId, @Param("today") LocalDate today);

    Optional<SlotBatchInventory> findBySlotIdAndBatchId(Long slotId, Long batchId);

    boolean existsBySlotIdAndQuantityGreaterThan(Long slotId, int quantity);

    boolean existsBySlotIdAndQuantityLessThan(Long slotId, int quantity);

    @Query("select case when count(s) > 0 then true else false end from SlotBatchInventory s "
            + "where s.quantity < 0 and (s.slotId = :slotId or s.batch.id = :batchId)")
    boolean hasNegativeQuantityForLoad(@Param("slotId") Long slotId, @Param("batchId") Long batchId);

    @Query("select coalesce(sum(s.quantity), 0) from SlotBatchInventory s where s.slotId = :slotId")
    long sumQuantityBySlotId(@Param("slotId") Long slotId);

    @Query("select coalesce(sum(s.quantity), 0) from SlotBatchInventory s where s.batch.id = :batchId")
    long sumQuantityByBatchId(@Param("batchId") Long batchId);
}
