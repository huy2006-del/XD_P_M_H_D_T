package com.example.app.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record MachineRequest(
        @NotBlank @Size(max = 80) String serialNumber,
        @NotBlank @Size(max = 150) String name,
        @Size(max = 100) String model,
        @NotNull Long locationId,
        @NotNull Long operatorId
) {
}
