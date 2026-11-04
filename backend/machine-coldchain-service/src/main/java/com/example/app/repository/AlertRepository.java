package com.example.app.repository;

import com.example.app.entity.Alert;
import com.example.app.entity.AlertStatus;
import com.example.app.entity.AlertType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.Optional;

public interface AlertRepository extends JpaRepository<Alert, Long>, JpaSpecificationExecutor<Alert> {

    Optional<Alert> findFirstByMachineIdAndAlertTypeAndStatusNotOrderByCreatedAtDesc(
            Long machineId,
            AlertType alertType,
            AlertStatus status
    );
}
