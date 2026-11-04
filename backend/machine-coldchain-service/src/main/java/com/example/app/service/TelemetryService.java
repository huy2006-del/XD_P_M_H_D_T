package com.example.app.service;

import com.example.app.dto.response.TemperatureLogResponse;

import java.util.List;

public interface TelemetryService {
    TemperatureLogResponse getLatest(Long machineId);

    List<TemperatureLogResponse> getHistory(Long machineId, int limit);

    TemperatureLogResponse recordTemperature(Long machineId, double temperature, double humidity);

    void captureOnlineMachines();

    void togglePower(Long machineId);
}
