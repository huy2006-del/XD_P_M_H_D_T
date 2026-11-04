package com.example.app.service;

import com.example.app.dto.response.AlertResponse;
import com.example.app.entity.AlertSeverity;
import com.example.app.entity.AlertStatus;
import com.example.app.entity.VendingMachine;

import java.util.List;
import java.util.Optional;

public interface AlertService {

    List<AlertResponse> getAlerts(AlertStatus status, AlertSeverity severity, Long machineId);

    AlertResponse acknowledge(Long alertId);

    AlertResponse resolve(Long alertId, String resolvedBy, String resolutionNote);

    Optional<AlertResponse> evaluateTemperature(VendingMachine machine, double temperature, boolean forceCritical);
}
