package com.example.app.repository;

import com.example.app.entity.TemperatureLog;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface TemperatureLogRepository extends JpaRepository<TemperatureLog, Long> {

    @Query("""
            select machine.id as machineId,
                   count(log.id) as totalPings,
                   sum(case when log.temperature >= machine.tempMinThreshold
                                  and log.temperature <= machine.tempMaxThreshold then 1 else 0 end) as inRangePings
            from TemperatureLog log
            join log.machine machine
            group by machine.id
            """)
    List<MachineTemperatureCompliance> summarizeMachineCompliance();

    Optional<TemperatureLog> findTopByMachineIdOrderByRecordedAtDescIdDesc(Long machineId);

    List<TemperatureLog> findByMachineIdOrderByRecordedAtDescIdDesc(Long machineId, Pageable pageable);

    Optional<TemperatureLog> findTopByMachineIdOrderByIdDesc(Long machineId);
}
