package com.example.app.dto.event;

/**
 * Sự kiện kết quả nhả hàng gửi sang inventory-service để cập nhật dispense_status của đơn.
 * status: DISPENSED | JAMMED. refundVoucherCode / refundPercent chỉ có khi JAMMED.
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
