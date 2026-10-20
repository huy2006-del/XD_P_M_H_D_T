package com.example.app.service.impl;

import com.example.app.dto.request.MachineRequest;
import com.example.app.dto.response.MachineResponse;
import com.example.app.entity.Location;
import com.example.app.entity.MachineStatus;
import com.example.app.entity.Operator;
import com.example.app.entity.VendingMachine;
import com.example.app.exception.DuplicateSerialNumberException;
import com.example.app.exception.BusinessRuleException;
import com.example.app.exception.ResourceNotFoundException;
import com.example.app.repository.LocationRepository;
import com.example.app.repository.OperatorRepository;
import com.example.app.repository.TemperatureLogRepository;
import com.example.app.repository.VendingMachineRepository;
import com.example.app.service.VendingMachineService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

@Service
@RequiredArgsConstructor
public class VendingMachineServiceImpl implements VendingMachineService {

    private final VendingMachineRepository machineRepository;
    private final LocationRepository locationRepository;
    private final OperatorRepository operatorRepository;
    private final TemperatureLogRepository temperatureLogRepository;

    @Override
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
        return machines.stream().map(this::toResponse).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public MachineResponse getById(Long id) {
        return toResponse(findMachine(id));
    }

    @Override
    @Transactional
    public MachineResponse create(MachineRequest request) {
        if (machineRepository.existsBySerialNumber(request.serialNumber())) {
            throw new DuplicateSerialNumberException(request.serialNumber());
        }
        Location location = findLocation(request.locationId());
        Operator operator = findOperator(request.operatorId());
        validateThresholds(request.tempMinThreshold(), request.tempMaxThreshold());
        VendingMachine machine = new VendingMachine(
                request.serialNumber(),
                request.name(),
                request.model(),
                location,
                operator,
                thresholdOrDefault(request.tempMinThreshold(), new BigDecimal("2.00")),
                thresholdOrDefault(request.tempMaxThreshold(), new BigDecimal("8.00"))
        );
        return toResponse(machineRepository.save(machine));
    }

    @Override
    @Transactional
    public MachineResponse update(Long id, MachineRequest request) {
        VendingMachine machine = findMachine(id);
        if (machineRepository.existsBySerialNumberAndIdNot(request.serialNumber(), id)) {
            throw new DuplicateSerialNumberException(request.serialNumber());
        }
        BigDecimal minThreshold = thresholdOrDefault(
                request.tempMinThreshold(), machine.getTempMinThreshold()
        );
        BigDecimal maxThreshold = thresholdOrDefault(
                request.tempMaxThreshold(), machine.getTempMaxThreshold()
        );
        validateThresholds(minThreshold, maxThreshold);
        machine.update(
                request.serialNumber(),
                request.name(),
                request.model(),
                findLocation(request.locationId()),
                findOperator(request.operatorId()),
                minThreshold,
                maxThreshold
        );
        return toResponse(machineRepository.save(machine));
    }

    @Override
    @Transactional
    public MachineResponse updateStatus(Long id, MachineStatus status) {
        VendingMachine machine = findMachine(id);
        machine.changeStatus(status);
        return toResponse(machineRepository.save(machine));
    }

    private MachineResponse toResponse(VendingMachine machine) {
        Double currentTemp = temperatureLogRepository
                .findTopByMachineIdOrderByRecordedAtDescIdDesc(machine.getId())
                .map(log -> log.getTemperature())
                .orElse(null);
        return MachineResponse.from(machine, currentTemp);
    }

    private BigDecimal thresholdOrDefault(BigDecimal threshold, BigDecimal defaultValue) {
        return threshold == null ? defaultValue : threshold;
    }

    private void validateThresholds(BigDecimal min, BigDecimal max) {
        if (min != null && max != null && min.compareTo(max) >= 0) {
            throw new BusinessRuleException("Ngưỡng nhiệt độ tối thiểu phải nhỏ hơn ngưỡng tối đa.");
        }
    }

    private VendingMachine findMachine(Long id) {
        return machineRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy máy bán hàng có id: " + id));
    }

    private Location findLocation(Long id) {
        return locationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy địa điểm có id: " + id));
    }

    private Operator findOperator(Long id) {
        return operatorRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy nhân viên có id: " + id));
    }
}
