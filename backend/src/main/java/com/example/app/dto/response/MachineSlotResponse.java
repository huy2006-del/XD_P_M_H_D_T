package com.example.app.dto.response;

import com.example.app.entity.MachineSlot;

import java.math.BigDecimal;

public record MachineSlotResponse(
        Long slotId,
        String slotCode,
        int capacity,
        int currentStock,
        String status,
        Long productId,
        String productName,
        BigDecimal productPrice,
        String productImageUrl
) {
    public static MachineSlotResponse from(MachineSlot slot) {
        return new MachineSlotResponse(
                slot.getId(),
                slot.getSlotCode(),
                slot.getCapacity(),
                slot.getCurrentStock(),
                slot.getStatus().name(),
                slot.getProduct() == null ? null : slot.getProduct().getId(),
                slot.getProduct() == null ? null : slot.getProduct().getName(),
                slot.getProduct() == null ? null : slot.getProduct().getPrice(),
                slot.getProduct() == null ? null : slot.getProduct().getImageUrl()
        );
    }
}
