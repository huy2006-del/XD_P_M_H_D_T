package com.example.app.service.impl;

import com.example.app.entity.Alert;
import com.example.app.entity.AlertSeverity;
import com.example.app.entity.AlertStatus;
import com.example.app.entity.AlertType;
import com.example.app.entity.MachineStatus;
import com.example.app.entity.VendingMachine;
import com.example.app.repository.AlertRepository;
import com.example.app.repository.VendingMachineRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicReference;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AlertServiceImplTest {

    @Mock
    private AlertRepository alertRepository;
    @Mock
    private VendingMachineRepository vendingMachineRepository;
    @Mock
    private SimpMessagingTemplate messagingTemplate;
    @Mock
    private VendingMachine machine;

    private AlertServiceImpl alertService;
    private final AtomicReference<Alert> currentAlert = new AtomicReference<>();

    @BeforeEach
    void setUp() {
        alertService = new AlertServiceImpl(alertRepository, vendingMachineRepository, messagingTemplate);
        when(machine.getId()).thenReturn(41L);
        when(machine.getSerialNumber()).thenReturn("FV-HCM-041");
        when(machine.getTempMinThreshold()).thenReturn(new BigDecimal("2.00"));
        when(machine.getTempMaxThreshold()).thenReturn(new BigDecimal("8.00"));
        when(machine.getStatus()).thenReturn(MachineStatus.ONLINE);
        when(alertRepository.findFirstByMachineIdAndAlertTypeAndStatusNotOrderByCreatedAtDesc(
                41L, AlertType.TEMP_HIGH, AlertStatus.RESOLVED
        )).thenAnswer(invocation -> Optional.ofNullable(currentAlert.get()));
        when(alertRepository.save(any(Alert.class))).thenAnswer(invocation -> {
            Alert alert = invocation.getArgument(0);
            currentAlert.set(alert);
            return alert;
        });
    }

    @Test
    void consecutiveTemperatureViolationsCreateWarningThenEscalateToCritical() {
        alertService.evaluateTemperature(machine, 9.0, false);
        assertEquals(AlertSeverity.WARNING, currentAlert.get().getSeverity());
        verify(messagingTemplate).convertAndSend(eq("/topic/alerts"), any(Object.class));

        alertService.evaluateTemperature(machine, 9.5, false);
        verify(messagingTemplate).convertAndSend(eq("/topic/alerts"), any(Object.class));
        verify(vendingMachineRepository, never()).save(machine);

        alertService.evaluateTemperature(machine, 10.0, false);
        assertEquals(AlertSeverity.CRITICAL, currentAlert.get().getSeverity());
        verify(machine).changeStatus(MachineStatus.OUT_OF_ORDER);
        verify(vendingMachineRepository).save(machine);
        verify(messagingTemplate, org.mockito.Mockito.times(2))
                .convertAndSend(eq("/topic/alerts"), any(Object.class));
    }

    @Test
    void spikeAboveTwelveImmediatelyCreatesCriticalAlert() {
        alertService.evaluateTemperature(machine, 13.0, true);

        assertEquals(AlertSeverity.CRITICAL, currentAlert.get().getSeverity());
        verify(machine).changeStatus(MachineStatus.OUT_OF_ORDER);
        verify(vendingMachineRepository).save(machine);
    }
}
