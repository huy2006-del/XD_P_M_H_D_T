package com.example.app.dto.request;

import com.example.app.entity.MachineSlotStatus;
import jakarta.validation.constraints.NotNull;

public record MachineSlotStatusRequest(@NotNull MachineSlotStatus status) {
}
