package com.example.app.controller;

import com.example.app.repository.SlotBatchInventoryRepository;
import com.example.app.repository.StockMovementRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/internal/api/v1/slots")
public class InternalInventoryController {

    private final SlotBatchInventoryRepository slotBatchInventoryRepository;
    private final StockMovementRepository stockMovementRepository;

    @GetMapping("/{slotId}/has-history")
    public boolean hasHistory(@PathVariable Long slotId) {
        return slotBatchInventoryRepository.existsBySlotIdAndQuantityGreaterThan(slotId, 0)
                || stockMovementRepository.existsBySlotId(slotId);
    }
}
