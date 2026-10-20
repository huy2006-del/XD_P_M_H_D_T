package com.example.app.repository;

import com.example.app.entity.MachineSlot;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface MachineSlotRepository extends JpaRepository<MachineSlot, Long> {

    @EntityGraph(attributePaths = "product")
    List<MachineSlot> findAllByMachineIdOrderBySlotCodeAsc(Long machineId);

    boolean existsByMachineIdAndSlotCodeIgnoreCase(Long machineId, String slotCode);

    boolean existsByMachineIdAndSlotCodeIgnoreCaseAndIdNot(Long machineId, String slotCode, Long id);

    @Override
    @EntityGraph(attributePaths = {"machine", "product"})
    Optional<MachineSlot> findById(Long id);
}
