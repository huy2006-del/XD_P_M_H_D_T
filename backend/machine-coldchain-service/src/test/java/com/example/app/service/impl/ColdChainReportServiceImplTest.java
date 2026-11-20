package com.example.app.service.impl;

import com.example.app.dto.response.ColdChainHealthReportResponse;
import com.example.app.entity.Alert;
import com.example.app.entity.AlertSeverity;
import com.example.app.entity.AlertStatus;
import com.example.app.entity.AlertType;
import com.example.app.entity.Location;
import com.example.app.entity.VendingMachine;
import com.example.app.repository.AlertRepository;
import com.example.app.repository.MachineTemperatureCompliance;
import com.example.app.repository.TemperatureLogRepository;
import com.example.app.repository.VendingMachineRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ColdChainReportServiceImplTest {

    @Mock
    private TemperatureLogRepository temperatureLogRepository;
    @Mock
    private AlertRepository alertRepository;
    @Mock
    private VendingMachineRepository vendingMachineRepository;

    @InjectMocks
    private ColdChainReportServiceImpl reportService;

    @Test
    void buildsComplianceCriticalAlertAndMttrSummaries() {
        LocalDateTime createdAt = LocalDateTime.of(2026, 11, 20, 10, 0);
        Alert firstCritical = new Alert(7L, AlertType.TEMP_HIGH, AlertSeverity.CRITICAL,
                "Temperature high", createdAt);
        Alert secondCritical = new Alert(7L, AlertType.TEMP_LOW, AlertSeverity.CRITICAL,
                "Temperature low", createdAt.plusMinutes(5));
        Alert resolvedAlert = new Alert(7L, AlertType.TEMP_HIGH, AlertSeverity.CRITICAL,
                "Resolved temperature issue", createdAt);
        resolvedAlert.resolve("operator", "repaired", createdAt.plusMinutes(30));

        VendingMachine machine = mock(VendingMachine.class);
        Location location = mock(Location.class);
        MachineTemperatureCompliance stats = mock(MachineTemperatureCompliance.class);
        when(machine.getId()).thenReturn(7L);
        when(machine.getSerialNumber()).thenReturn("FV-007");
        when(machine.getName()).thenReturn("Downtown machine");
        when(machine.getLocation()).thenReturn(location);
        when(location.getName()).thenReturn("Downtown");
        when(stats.getMachineId()).thenReturn(7L);
        when(stats.getTotalPings()).thenReturn(4L);
        when(stats.getInRangePings()).thenReturn(3L);
        when(vendingMachineRepository.findAllByOrderByIdAsc()).thenReturn(List.of(machine));
        when(temperatureLogRepository.summarizeMachineCompliance()).thenReturn(List.of(stats));
        when(alertRepository.findBySeverityOrderByMachineIdAscCreatedAtDesc(AlertSeverity.CRITICAL))
                .thenReturn(List.of(firstCritical, secondCritical));
        when(alertRepository.findByStatusAndResolvedAtIsNotNull(AlertStatus.RESOLVED))
                .thenReturn(List.of(resolvedAlert));

        ColdChainHealthReportResponse report = reportService.getColdChainHealthReport();

        assertEquals(30.0, report.systemMttrMinutes());
        assertEquals(75.0, report.topStableMachines().get(0).complianceRate());
        assertEquals("Downtown", report.topStableMachines().get(0).locationName());
        assertEquals(4, report.topStableMachines().get(0).totalPings());
        assertEquals(2, report.criticalAlertMachines().get(0).criticalAlertCount());
        assertEquals("FV-007", report.criticalAlertMachines().get(0).serialNumber());
        assertEquals(2, report.criticalAlertMachines().get(0).criticalAlerts().size());
    }

    @Test
    void returnsZeroMttrWhenNoAlertsHaveBeenResolved() {
        when(vendingMachineRepository.findAllByOrderByIdAsc()).thenReturn(List.of());
        when(temperatureLogRepository.summarizeMachineCompliance()).thenReturn(List.of());
        when(alertRepository.findBySeverityOrderByMachineIdAscCreatedAtDesc(AlertSeverity.CRITICAL))
                .thenReturn(List.of());
        when(alertRepository.findByStatusAndResolvedAtIsNotNull(AlertStatus.RESOLVED)).thenReturn(List.of());

        assertEquals(0.0, reportService.getColdChainHealthReport().systemMttrMinutes());
    }
}
