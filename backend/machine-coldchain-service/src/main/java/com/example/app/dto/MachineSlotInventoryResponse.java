package com.example.app.dto;

public record MachineSlotInventoryResponse(
        Long slotId,
        Long productId,
        int capacity,
        int currentStock,
        String status
) {
}
