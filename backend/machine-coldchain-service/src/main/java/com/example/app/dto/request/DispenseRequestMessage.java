package com.example.app.dto.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;

public record DispenseRequestMessage(
        @NotBlank String orderId,
        @NotBlank String machineId,
        @NotBlank String slotId,
        boolean simulateJam,
        @Min(0) int retryCount
) {
    public DispenseRequestMessage(String orderId, String machineId, String slotId, boolean simulateJam) {
        this(orderId, machineId, slotId, simulateJam, 0);
    }

    public DispenseRequestMessage withRetryCount(int updatedRetryCount) {
        return new DispenseRequestMessage(orderId, machineId, slotId, simulateJam, updatedRetryCount);
    }
}
