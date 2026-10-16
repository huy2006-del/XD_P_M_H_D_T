package com.example.app.service;

import com.example.app.dto.MachineRequest;
import com.example.app.dto.MachineResponse;
import com.example.app.entity.Location;
import com.example.app.entity.MachineStatus;
import com.example.app.entity.Operator;
import com.example.app.entity.VendingMachine;
import com.example.app.exception.DuplicateSerialNumberException;
import com.example.app.exception.ResourceNotFoundException;
import com.example.app.repository.LocationRepository;
import com.example.app.repository.OperatorRepository;
import com.example.app.repository.VendingMachineRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional
public class VendingMachineService {

    private final VendingMachineRepository machineRepository;
    private final LocationRepository locationRepository;
    private final OperatorRepository operatorRepository;

    public VendingMachineService(
            VendingMachineRepository machineRepository,
            LocationRepository locationRepository,
            OperatorRepository operatorRepository
    ) {
        this.machineRepository = machineRepository;
        this.locationRepository = locationRepository;
        this.operatorRepository = operatorRepository;
    }

    @Transactional(readOnly = true)
    public List<MachineResponse> getAll(MachineStatus status, Long locationId) {
        List<VendingMachine> machines;
        if (status != null && locationId != null) {
            machines = machineRepository.findByStatusAndLocationIdOrderByIdAsc(status, locationId);
        } else if (status != null) {
            machines = machineRepository.findByStatusOrderByIdAsc(status);
        } else if (locationId != null) {
            machines = machineRepository.findByLocationIdOrderByIdAsc(locationId);
        } else {
            machines = machineRepository.findAllByOrderByIdAsc();
        }
        return machines.stream().map(MachineResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public MachineResponse getById(Long id) {
        return MachineResponse.from(findMachine(id));
    }

    public MachineResponse create(MachineRequest request) {
        if (machineRepository.existsBySerialNumber(request.serialNumber())) {
            throw new DuplicateSerialNumberException(request.serialNumber());
        }
        Location location = findLocation(request.locationId());
        Operator operator = findOperator(request.operatorId());
        VendingMachine machine = new VendingMachine(
                request.serialNumber(),
                request.name(),
                request.model(),
                location,
                operator
        );
        return MachineResponse.from(machineRepository.save(machine));
    }

    public MachineResponse update(Long id, MachineRequest request) {
        VendingMachine machine = findMachine(id);
        if (machineRepository.existsBySerialNumberAndIdNot(request.serialNumber(), id)) {
            throw new DuplicateSerialNumberException(request.serialNumber());
        }
        machine.update(
                request.serialNumber(),
                request.name(),
                request.model(),
                findLocation(request.locationId()),
                findOperator(request.operatorId())
        );
        return MachineResponse.from(machineRepository.save(machine));
    }

    public MachineResponse updateStatus(Long id, MachineStatus status) {
        VendingMachine machine = findMachine(id);
        machine.changeStatus(status);
        return MachineResponse.from(machineRepository.save(machine));
    }

    private VendingMachine findMachine(Long id) {
        return machineRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Machine", id));
    }

    private Location findLocation(Long id) {
        return locationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Location", id));
    }

    private Operator findOperator(Long id) {
        return operatorRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Operator", id));
    }
}
