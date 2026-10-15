package com.example.app.dto;

import com.example.app.entity.MachineStatus;
import jakarta.validation.constraints.NotNull;

public record MachineStatusRequest(@NotNull MachineStatus status) {
}
