package com.example.app.repository;

import com.example.app.entity.RestockSession;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface RestockSessionRepository
        extends JpaRepository<RestockSession, Long> {

    interface HistoryRow {
        Long getId();
        String getSessionCode();
        Long getMachineId();
        UUID getOperatorId();
        String getStatus();
        LocalDateTime getStartedAt();
        LocalDateTime getCompletedAt();
        String getNotes();
        Long getItemId();
        Long getSlotId();
        String getSlotCode();
        Long getBatchId();
        String getBatchCode();
        String getProductName();
        Integer getQuantityAdded();
    }

    @Query(value = """
            SELECT s.id, s.session_code AS "sessionCode", s.machine_id AS "machineId",
                   s.operator_id AS "operatorId", s.status, s.started_at AS "startedAt",
                   s.completed_at AS "completedAt", s.notes, i.id AS "itemId",
                   i.slot_id AS "slotId", i.slot_code AS "slotCode",
                   i.batch_id AS "batchId", i.batch_code AS "batchCode",
                   i.product_name AS "productName", i.quantity_added AS "quantityAdded"
            FROM restock_sessions s
            LEFT JOIN restock_items i ON i.session_id = s.id
            WHERE (CAST(:machineId AS bigint) IS NULL OR s.machine_id = :machineId)
              AND (CAST(:operatorId AS uuid) IS NULL OR s.operator_id = :operatorId)
            ORDER BY s.started_at DESC, s.id DESC, i.id
            """, nativeQuery = true)
    List<HistoryRow> findHistory(
            Long machineId,
            UUID operatorId
    );

    Optional<RestockSession> findByOperatorIdAndRequestId(
            UUID operatorId,
            UUID requestId
    );

    @Query(value = """
            SELECT 1
            FROM pg_advisory_xact_lock(
                hashtextextended(:key, 317)
            )
            """, nativeQuery = true)
    int lockCreateRequest(@Param("key") String key);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select session from RestockSession session where session.id = :id")
    Optional<RestockSession> findByIdForUpdate(
            @Param("id") Long id
    );

    // Lay so thu tu phien tiep hang lon nhat trong ngay
    @Query(value = """
            SELECT COALESCE(
                MAX(CAST(RIGHT(session_code, 3) AS INTEGER)), 0
            )
            FROM restock_sessions
            WHERE session_code LIKE CONCAT(:prefix, '%')
              AND session_code ~ '^RS-[0-9]{8}-[0-9]{3}$'
            """, nativeQuery = true)
    int findMaxSessionSequence(
            @Param("prefix") String prefix
    );
}