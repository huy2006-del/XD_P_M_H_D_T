package com.example.app.service.impl;

import com.example.app.dto.response.AlertResponse;
import com.example.app.entity.Alert;
import com.example.app.entity.AlertSeverity;
import com.example.app.entity.AlertStatus;
import com.example.app.entity.AlertType;
import com.example.app.entity.MachineStatus;
import com.example.app.entity.VendingMachine;
import com.example.app.exception.BusinessRuleException;
import com.example.app.exception.ResourceNotFoundException;
import com.example.app.repository.AlertRepository;
import com.example.app.repository.VendingMachineRepository;
import com.example.app.service.AlertService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

@Service
@RequiredArgsConstructor
public class AlertServiceImpl implements AlertService {

    private static final int CRITICAL_VIOLATION_COUNT = 3;

    private final AlertRepository alertRepository;
    private final VendingMachineRepository vendingMachineRepository;
    private final SimpMessagingTemplate messagingTemplate;
    private final ConcurrentMap<String, Integer> consecutiveViolations = new ConcurrentHashMap<>();

    @Override
    @Transactional(readOnly = true)
    public List<AlertResponse> getAlerts(AlertStatus status, AlertSeverity severity, Long machineId) {
        Specification<Alert> specification = (root, query, builder) -> builder.conjunction();
        if (status != null) {
            specification = specification.and((root, query, builder) ->
                    builder.equal(root.get("status"), status));
        }
        if (severity != null) {
            specification = specification.and((root, query, builder) ->
                    builder.equal(root.get("severity"), severity));
        }
        if (machineId != null) {
            specification = specification.and((root, query, builder) ->
                    builder.equal(root.get("machineId"), machineId));
        }
        return alertRepository.findAll(specification).stream()
                .map(AlertResponse::from)
                .toList();
    }

    @Override
    @Transactional
    public AlertResponse acknowledge(Long alertId) {
        Alert alert = findAlert(alertId);
        try {
            alert.acknowledge();
        } catch (IllegalStateException exception) {
            throw new BusinessRuleException(exception.getMessage());
        }
        AlertResponse response = AlertResponse.from(alertRepository.save(alert));
        messagingTemplate.convertAndSend("/topic/alerts", response);
        return response;
    }

    @Override
    @Transactional
    public AlertResponse resolve(Long alertId, String resolvedBy, String resolutionNote) {
        Alert alert = findAlert(alertId);
        try {
            alert.resolve(resolvedBy, resolutionNote.trim(), LocalDateTime.now());
        } catch (IllegalStateException exception) {
            throw new BusinessRuleException(exception.getMessage());
        }
        AlertResponse response = AlertResponse.from(alertRepository.save(alert));
        messagingTemplate.convertAndSend("/topic/alerts", response);
        return response;
    }

    @Override
    @Transactional
    public Optional<AlertResponse> evaluateTemperature(
            VendingMachine machine,
            double temperature,
            boolean forceCritical
    ) {
        Long machineId = machine.getId();
        boolean tooHot = temperature > machine.getTempMaxThreshold().doubleValue() || forceCritical;
        boolean tooCold = !tooHot && temperature < machine.getTempMinThreshold().doubleValue();
        if (!tooHot && !tooCold) {
            resetViolationCounters(machineId);
            return Optional.empty();
        }

        AlertType alertType = tooHot ? AlertType.TEMP_HIGH : AlertType.TEMP_LOW;
        String key = machineId + ":" + alertType.name();
        consecutiveViolations.keySet().removeIf(counterKey -> counterKey.startsWith(machineId + ":")
                && !counterKey.equals(key));
        int violationCount = consecutiveViolations.merge(key, 1, Integer::sum);
        boolean critical = forceCritical || violationCount >= CRITICAL_VIOLATION_COUNT;
        if (forceCritical && violationCount < CRITICAL_VIOLATION_COUNT) {
            consecutiveViolations.put(key, CRITICAL_VIOLATION_COUNT);
        }
        String message = String.format(
                "Máy %s ghi nhận nhiệt độ %.2f°C, ngoài ngưỡng cho phép %.2f°C–%.2f°C.",
                machine.getSerialNumber(),
                temperature,
                machine.getTempMinThreshold(),
                machine.getTempMaxThreshold()
        );

        Optional<Alert> existing = alertRepository
                .findFirstByMachineIdAndAlertTypeAndStatusNotOrderByCreatedAtDesc(
                        machineId, alertType, AlertStatus.RESOLVED);
        Alert alert;
        boolean shouldPublish;
        if (existing.isEmpty()) {
            alert = alertRepository.save(new Alert(
                    machineId,
                    alertType,
                    critical ? AlertSeverity.CRITICAL : AlertSeverity.WARNING,
                    message,
                    LocalDateTime.now()
            ));
            shouldPublish = true;
        } else {
            alert = existing.get();
            shouldPublish = critical && alert.escalateToCritical(message);
            if (shouldPublish) {
                alert = alertRepository.save(alert);
            }
        }

        if (critical && machine.getStatus() != MachineStatus.OUT_OF_ORDER) {
            machine.changeStatus(MachineStatus.OUT_OF_ORDER);
            vendingMachineRepository.save(machine);
        }

        if (shouldPublish) {
            messagingTemplate.convertAndSend("/topic/alerts", AlertResponse.from(alert));
        }
        return shouldPublish ? Optional.of(AlertResponse.from(alert)) : Optional.empty();
    }

    private Alert findAlert(Long alertId) {
        return alertRepository.findById(alertId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy cảnh báo có id: " + alertId));
    }

    private void resetViolationCounters(Long machineId) {
        String prefix = machineId + ":";
        consecutiveViolations.keySet().removeIf(key -> key.startsWith(prefix));
    }
}
