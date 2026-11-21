package com.example.app.dto.response;

import java.util.List;

public record CriticalMachineSummaryDTO(
        Long machineId,
        String serialNumber,
        String name,
        long criticalAlertCount,
        List<AlertDetailDTO> criticalAlerts
) {
}
