package com.example.app.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.LocalDate;

public record BatchRequest(
        @NotNull Long productId,
        @NotBlank @Size(max = 50) String batchCode,
        @Size(max = 150) String supplier,
        LocalDate importDate,
        @NotNull LocalDate expiryDate,
        @NotNull @Positive Integer quantityImported,
        @NotNull @DecimalMin(value = "0.0", message = "unitCost must be >= 0") BigDecimal unitCost
) {}
