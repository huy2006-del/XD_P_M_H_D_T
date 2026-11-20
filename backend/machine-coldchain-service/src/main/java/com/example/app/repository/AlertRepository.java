package com.example.app.repository;

import com.example.app.entity.Alert;
import com.example.app.entity.AlertStatus;
import com.example.app.entity.AlertType;
import com.example.app.entity.AlertSeverity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.Optional;
import java.util.List;

public interface AlertRepository extends JpaRepository<Alert, Long>, JpaSpecificationExecutor<Alert> {

    List<Alert> findBySeverityOrderByMachineIdAscCreatedAtDesc(AlertSeverity severity);

    List<Alert> findByStatusAndResolvedAtIsNotNull(AlertStatus status);

    Optional<Alert> findFirstByMachineIdAndAlertTypeAndStatusNotOrderByCreatedAtDesc(
            Long machineId,
            AlertType alertType,
            AlertStatus status
    );
}
