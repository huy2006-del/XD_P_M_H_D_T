package com.example.app.dto;

import com.example.app.entity.VendingMachine;
import com.fasterxml.jackson.annotation.JsonInclude;

import java.time.Instant;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record MachineResponse(
        Long id,
        String serialNumber,
        String name,
        String model,
        String status,
        LocationSummary location,
        OperatorResponse operator,
        Instant lastPingAt
) {
    public static MachineResponse from(VendingMachine machine) {
        return new MachineResponse(
                machine.getId(),
                machine.getSerialNumber(),
                machine.getName(),
                machine.getModel(),
                machine.getStatus().name(),
                new LocationSummary(
                        machine.getLocation().getId(),
                        machine.getLocation().getName(),
                        machine.getLocation().getAddress()
                ),
                OperatorResponse.from(machine.getOperator()),
                machine.getLastPingAt()
        );
    }

    public record LocationSummary(Long id, String name, String address) {
    }
}
