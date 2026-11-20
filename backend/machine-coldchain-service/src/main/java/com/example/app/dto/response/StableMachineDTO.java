package com.example.app.dto.response;

public record StableMachineDTO(
        Long machineId,
        String serialNumber,
        String name,
        String locationName,
        double complianceRate,
        long totalPings,
        long inRangePings
) {
}
