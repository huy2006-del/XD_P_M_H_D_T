package com.example.app.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;

public record ProductRequest(
        @NotBlank @Size(max = 150) String name,
        @NotBlank @Size(max = 80) String sku,
        @NotNull @DecimalMin(value = "0.0", inclusive = false, message = "Price must be greater than 0") BigDecimal price,
        @NotBlank @Size(max = 20) String unit,
        @Size(max = 1000) String imageUrl,
        @NotNull @Positive Integer shelfLifeDays,
        @NotNull BigDecimal minTempC,
        @NotNull BigDecimal maxTempC,
        @Size(max = 2000) String description
) {}
