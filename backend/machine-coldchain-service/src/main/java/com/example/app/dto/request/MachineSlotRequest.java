package com.example.app.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record MachineSlotRequest(
        @NotBlank @Size(max = 20) String slotCode,
        Long productId,
        @Min(1) @Max(100) Integer capacity
) {
}
