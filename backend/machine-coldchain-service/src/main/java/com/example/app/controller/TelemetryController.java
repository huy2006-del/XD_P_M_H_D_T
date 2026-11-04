package com.example.app.controller;

import com.example.app.dto.response.TemperatureLogResponse;
import com.example.app.service.TelemetryService;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@Validated
@RequiredArgsConstructor
@RequestMapping("/api/v1/machines/{machineId}/telemetry")
public class TelemetryController {

    private final TelemetryService telemetryService;

    @GetMapping("/latest")
    public TemperatureLogResponse getLatest(@PathVariable Long machineId) {
        return telemetryService.getLatest(machineId);
    }

    @GetMapping("/history")
    public List<TemperatureLogResponse> getHistory(
            @PathVariable Long machineId,
            @RequestParam(defaultValue = "30") @Min(1) @Max(500) int limit
    ) {
        return telemetryService.getHistory(machineId, limit);
    }
}
