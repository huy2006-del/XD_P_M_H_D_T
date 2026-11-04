package com.example.app.dto;

import com.example.app.entity.SlotBatchInventory;
import java.time.LocalDate;

public record SlotInventoryItem(Long batchId, String batchCode, LocalDate expiryDate, int quantity) {
    public static SlotInventoryItem from(SlotBatchInventory s) {
        return new SlotInventoryItem(s.getBatch().getId(), s.getBatch().getBatchCode(),
                s.getBatch().getExpiryDate(), s.getQuantity());
    }
}
