package com.example.app.dto;

/**
 * Kết quả nhả hàng do machine-coldchain-service gửi qua RabbitMQ.
 * status: DISPENSED | JAMMED; refundVoucherCode / refundPercent chỉ có khi JAMMED.
 */
public record DispenseResultEvent(
        String orderId,
        Long machineId,
        Long slotId,
        String status,
        String refundVoucherCode,
        Integer refundPercent
) {
}
