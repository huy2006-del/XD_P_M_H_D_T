package com.example.app.dto.response;

import com.example.app.dto.response.OperatorResponse;
import com.example.app.entity.VendingMachine;
import com.fasterxml.jackson.annotation.JsonInclude;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record MachineResponse(
        Long id,
        String serialNumber,
        String name,
        String model,
        String status,
        LocationSummary location,
        String locationName,
        OperatorResponse operator,
        LocalDateTime lastPingAt,
        BigDecimal tempMinThreshold,
        BigDecimal tempMaxThreshold,
        Double currentTemp
) {
    public static MachineResponse from(VendingMachine machine, Double currentTemp) {
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
                machine.getLocation().getName(),
                OperatorResponse.from(machine.getOperator()),
                machine.getLastPingAt(),
                machine.getTempMinThreshold(),
                machine.getTempMaxThreshold(),
                currentTemp
        );
    }

    public record LocationSummary(Long id, String name, String address) {
    }
}
