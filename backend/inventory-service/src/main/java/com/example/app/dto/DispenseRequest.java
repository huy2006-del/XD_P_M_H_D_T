package com.example.app.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public record DispenseRequest(@NotNull @Positive Integer quantity) {}
