package com.example.app.dto.response;

import com.example.app.dto.ProductDTO;
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
    public static MachineSlotResponse from(MachineSlot slot, ProductDTO product) {
        return new MachineSlotResponse(
                slot.getId(),
                slot.getSlotCode(),
                slot.getCapacity(),
                slot.getCurrentStock(),
                slot.getStatus().name(),
                slot.getProductId(),
                product == null ? null : product.name(),
                product == null ? null : product.price(),
                product == null ? null : product.imageUrl()
        );
    }
}
