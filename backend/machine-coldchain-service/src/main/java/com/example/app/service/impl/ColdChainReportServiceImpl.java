package com.example.app.service.impl;

import com.example.app.dto.response.AlertDetailDTO;
import com.example.app.dto.response.ColdChainHealthReportResponse;
import com.example.app.dto.response.CriticalMachineSummaryDTO;
import com.example.app.dto.response.StableMachineDTO;
import com.example.app.entity.Alert;
import com.example.app.entity.AlertSeverity;
import com.example.app.entity.AlertStatus;
import com.example.app.entity.VendingMachine;
import com.example.app.repository.AlertRepository;
import com.example.app.repository.MachineTemperatureCompliance;
import com.example.app.repository.TemperatureLogRepository;
import com.example.app.repository.VendingMachineRepository;
import com.example.app.service.ColdChainReportService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ColdChainReportServiceImpl implements ColdChainReportService {

    private final TemperatureLogRepository temperatureLogRepository;
    private final AlertRepository alertRepository;
    private final VendingMachineRepository vendingMachineRepository;

    @Override
    @Transactional(readOnly = true)
    public ColdChainHealthReportResponse getColdChainHealthReport() {
        LocalDateTime generatedAt = LocalDateTime.now();
        List<VendingMachine> machines = vendingMachineRepository.findAllByOrderByIdAsc();
        Map<Long, VendingMachine> machinesById = machines.stream()
                .collect(Collectors.toMap(VendingMachine::getId, machine -> machine));

        List<StableMachineDTO> stableMachines = buildStableMachineSummary(machines);
        List<Alert> criticalAlerts = alertRepository.findBySeverityOrderByMachineIdAscCreatedAtDesc(
                AlertSeverity.CRITICAL);
        List<CriticalMachineSummaryDTO> criticalMachines = buildCriticalMachineSummary(
                criticalAlerts, machinesById, generatedAt);
        double mttrMinutes = calculateSystemMttr();

        return new ColdChainHealthReportResponse(generatedAt, mttrMinutes, stableMachines, criticalMachines);
    }

    private List<StableMachineDTO> buildStableMachineSummary(List<VendingMachine> machines) {
        Map<Long, MachineTemperatureCompliance> complianceByMachine =
                temperatureLogRepository.summarizeMachineCompliance().stream()
                        .collect(Collectors.toMap(MachineTemperatureCompliance::getMachineId, result -> result));

        return machines.stream()
                .map(machine -> {
                    MachineTemperatureCompliance stats = complianceByMachine.get(machine.getId());
                    long total = stats == null || stats.getTotalPings() == null ? 0 : stats.getTotalPings();
                    long inRange = stats == null || stats.getInRangePings() == null ? 0 : stats.getInRangePings();
                    double compliance = total == 0 ? 0.0 : inRange * 100.0 / total;
                    return new StableMachineDTO(
                            machine.getId(), machine.getSerialNumber(), machine.getName(),
                            machine.getLocation().getName(), compliance, total, inRange);
                })
                .sorted(Comparator.comparingDouble(StableMachineDTO::complianceRate).reversed()
                        .thenComparing(StableMachineDTO::machineId))
                .toList();
    }

    private List<CriticalMachineSummaryDTO> buildCriticalMachineSummary(
            List<Alert> alerts,
            Map<Long, VendingMachine> machinesById,
            LocalDateTime generatedAt
    ) {
        Map<Long, List<Alert>> alertsByMachine = alerts.stream()
                .collect(Collectors.groupingBy(Alert::getMachineId));
        List<CriticalMachineSummaryDTO> summaries = new ArrayList<>();
        alertsByMachine.forEach((machineId, machineAlerts) -> {
            VendingMachine machine = machinesById.get(machineId);
            if (machine == null) {
                return;
            }
            List<AlertDetailDTO> details = machineAlerts.stream()
                    .sorted(Comparator.comparing(Alert::getCreatedAt).reversed())
                    .map(alert -> toAlertDetail(alert, generatedAt))
                    .toList();
            summaries.add(new CriticalMachineSummaryDTO(
                    machineId, machine.getSerialNumber(), machine.getName(), details.size(), details));
        });
        return summaries.stream()
                .sorted(Comparator.comparingLong(CriticalMachineSummaryDTO::criticalAlertCount).reversed()
                        .thenComparing(CriticalMachineSummaryDTO::machineId))
                .toList();
    }

    private AlertDetailDTO toAlertDetail(Alert alert, LocalDateTime generatedAt) {
        LocalDateTime end = alert.getResolvedAt() == null ? generatedAt : alert.getResolvedAt();
        long durationMinutes = Math.max(0, Duration.between(alert.getCreatedAt(), end).toMinutes());
        return new AlertDetailDTO(alert.getId(), alert.getAlertType().name(), alert.getMessage(),
                alert.getCreatedAt(), alert.getResolvedAt(), durationMinutes);
    }

    private double calculateSystemMttr() {
        List<Alert> resolvedAlerts = alertRepository.findByStatusAndResolvedAtIsNotNull(AlertStatus.RESOLVED);
        if (resolvedAlerts.isEmpty()) {
            return 0.0;
        }
        long totalMinutes = resolvedAlerts.stream()
                .mapToLong(alert -> Math.max(0, Duration.between(alert.getCreatedAt(), alert.getResolvedAt()).toMinutes()))
                .sum();
        return (double) totalMinutes / resolvedAlerts.size();
    }
}
