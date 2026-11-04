package com.example.app.repository;

import com.example.app.entity.MachineStatus;
import com.example.app.entity.VendingMachine;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface VendingMachineRepository extends JpaRepository<VendingMachine, Long> {

    boolean existsBySerialNumber(String serialNumber);

    boolean existsBySerialNumberAndIdNot(String serialNumber, Long id);

    List<VendingMachine> findByStatus(MachineStatus status);

    List<VendingMachine> findAllByOrderByIdAsc();

    List<VendingMachine> findByStatusOrderByIdAsc(MachineStatus status);

    List<VendingMachine> findByLocationIdOrderByIdAsc(Long locationId);

    List<VendingMachine> findByStatusAndLocationIdOrderByIdAsc(MachineStatus status, Long locationId);

    @Override
    Optional<VendingMachine> findById(Long id);
}
