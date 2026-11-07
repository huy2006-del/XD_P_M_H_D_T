package com.example.app.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "dispense_operations")
@Getter
@NoArgsConstructor
public class DispenseOperation {

    @Id
    @Column(name = "order_id", nullable = false, length = 100)
    private String orderId;

    @Column(name = "machine_id", nullable = false)
    private Long machineId;

    @Column(name = "slot_id", nullable = false)
    private Long slotId;

    @Enumerated(EnumType.STRING)
    @Column(name = "dispense_status", nullable = false, length = 20)
    private DispenseStatus status;

    @Column(name = "retry_count", nullable = false)
    private int retryCount;

    @Column(name = "refund_voucher_code", length = 100)
    private String refundVoucherCode;

    @Column(name = "refund_percent")
    private Integer refundPercent;

    @Column(name = "alert_id")
    private Long alertId;

    @Column(name = "completed_at", nullable = false)
    private LocalDateTime completedAt;

    public DispenseOperation(String orderId, Long machineId, Long slotId, int retryCount) {
        this.orderId = orderId;
        this.machineId = machineId;
        this.slotId = slotId;
        this.retryCount = retryCount;
        this.status = DispenseStatus.DISPENSED;
        this.completedAt = LocalDateTime.now();
    }

    public void markJammed(int retryCount, String voucherCode, Long alertId) {
        this.status = DispenseStatus.JAMMED;
        this.retryCount = retryCount;
        this.refundVoucherCode = voucherCode;
        this.refundPercent = 100;
        this.alertId = alertId;
        this.completedAt = LocalDateTime.now();
    }
}
