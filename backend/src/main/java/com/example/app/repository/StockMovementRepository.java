package com.example.app.repository;

import com.example.app.entity.StockMovement;
import org.springframework.data.jpa.repository.JpaRepository;

public interface StockMovementRepository extends JpaRepository<StockMovement, Long> {
    boolean existsBySlotId(Long slotId);
}
