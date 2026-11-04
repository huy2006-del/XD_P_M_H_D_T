package com.example.app.repository;

import com.example.app.entity.TemperatureLog;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface TemperatureLogRepository extends JpaRepository<TemperatureLog, Long> {

    Optional<TemperatureLog> findTopByMachineIdOrderByRecordedAtDescIdDesc(Long machineId);

    List<TemperatureLog> findByMachineIdOrderByRecordedAtDescIdDesc(Long machineId, Pageable pageable);

    Optional<TemperatureLog> findTopByMachineIdOrderByIdDesc(Long machineId);
}
