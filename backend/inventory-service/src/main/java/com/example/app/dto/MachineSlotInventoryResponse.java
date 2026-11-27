package com.example.app.dto;

public record MachineSlotInventoryResponse(
        Long slotId,
        Long productId,
        int capacity,
        int currentStock,
        String status,
        String slotCode,
        String productName
) {
    public MachineSlotInventoryResponse(
            Long slotId,
            Long productId,
            int capacity,
            int currentStock,
            String status
    ) {
        this(slotId, productId, capacity,
                currentStock, status, null, null);
    }
}