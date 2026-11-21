package com.example.app.dto.response;

import java.time.LocalDateTime;
import java.util.List;

public record ColdChainHealthReportResponse(
        LocalDateTime reportGeneratedAt,
        double systemMttrMinutes,
        List<StableMachineDTO> topStableMachines,
        List<CriticalMachineSummaryDTO> criticalAlertMachines
) {
}
