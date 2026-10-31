package com.example.app.controller;

import com.example.app.dto.response.TemperatureLogResponse;
import com.example.app.service.TelemetryService;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@Validated
@RequiredArgsConstructor
@RequestMapping("/api/v1/simulator/machines/{machineId}")
public class SimulatorController {

    private static final double SPIKE_HUMIDITY = 85.0;

    private final TelemetryService telemetryService;

    @PostMapping({"/temperature-spike", "/temp-spike"})
    public ResponseEntity<TemperatureLogResponse> createTemperatureSpike(
            @PathVariable Long machineId,
            @RequestParam @DecimalMin("-50.0") @DecimalMax("100.0") double temp
    ) {
        return ResponseEntity.ok(telemetryService.recordTemperature(
                machineId, temp, SPIKE_HUMIDITY
        ));
    }

    @PostMapping("/toggle-power")
    public ResponseEntity<Void> togglePower(@PathVariable Long machineId) {
        telemetryService.togglePower(machineId);
        return ResponseEntity.noContent().build();
    }
}
