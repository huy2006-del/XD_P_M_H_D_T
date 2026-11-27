package com.example.app.repository;

import com.example.app.entity.FruitBatch;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface FruitBatchRepository extends JpaRepository<FruitBatch, Long>, JpaSpecificationExecutor<FruitBatch> {
    boolean existsByBatchCodeIgnoreCase(String batchCode);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select b from FruitBatch b where b.id = :id")
    Optional<FruitBatch> findByIdForUpdate(@Param("id") Long id);

    @Query("select b from FruitBatch b join fetch b.product p "
            + "where b.expiryDate < :today and b.quantityRemaining > 0 "
            + "order by b.expiryDate asc, b.id asc")
    List<FruitBatch> findExpiredBatchesWithRemainingStock(@Param("today") LocalDate today);
}
