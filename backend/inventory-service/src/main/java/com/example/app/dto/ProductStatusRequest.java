package com.example.app.dto;

import jakarta.validation.constraints.NotNull;

public record ProductStatusRequest(@NotNull Boolean isActive) {}
