package com.example.app.dto.response;

public record DispenseNotification(
        String orderId,
        Long machineId,
        Long slotId,
        String status,
        String message,
        String refundVoucherCode,
        Integer refundPercent
) {
}
