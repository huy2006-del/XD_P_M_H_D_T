package com.example.app.repository;

import com.example.app.entity.MachineStatus;
import com.example.app.entity.VendingMachine;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface VendingMachineRepository extends JpaRepository<VendingMachine, Long> {

    boolean existsBySerialNumber(String serialNumber);

    boolean existsBySerialNumberAndIdNot(String serialNumber, Long id);

    @EntityGraph(attributePaths = {"location", "operator"})
    List<VendingMachine> findAllByOrderByIdAsc();

    @EntityGraph(attributePaths = {"location", "operator"})
    List<VendingMachine> findByStatusOrderByIdAsc(MachineStatus status);

    @EntityGraph(attributePaths = {"location", "operator"})
    List<VendingMachine> findByLocationIdOrderByIdAsc(Long locationId);

    @EntityGraph(attributePaths = {"location", "operator"})
    List<VendingMachine> findByStatusAndLocationIdOrderByIdAsc(MachineStatus status, Long locationId);

    @Override
    @EntityGraph(attributePaths = {"location", "operator"})
    Optional<VendingMachine> findById(Long id);
}
