package com.example.app.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public record MachineRequest(
        @NotBlank @Size(max = 80) String serialNumber,
        @NotBlank @Size(max = 150) String name,
        @Size(max = 100) String model,
        @NotNull Long locationId,
        @NotNull Long operatorId,
        @DecimalMin("-50.0") @DecimalMax("50.0") BigDecimal tempMinThreshold,
        @DecimalMin("-50.0") @DecimalMax("50.0") BigDecimal tempMaxThreshold
) {
}
