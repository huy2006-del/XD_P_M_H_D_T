package com.example.app.service.impl;

import com.example.app.dto.response.TemperatureLogResponse;
import com.example.app.entity.MachineStatus;
import com.example.app.entity.TemperatureLog;
import com.example.app.entity.VendingMachine;
import com.example.app.exception.BusinessRuleException;
import com.example.app.exception.ResourceNotFoundException;
import com.example.app.repository.TemperatureLogRepository;
import com.example.app.repository.VendingMachineRepository;
import com.example.app.service.TelemetryService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.concurrent.ThreadLocalRandom;

@Service
@RequiredArgsConstructor
public class TelemetryServiceImpl implements TelemetryService {

    private static final double MIN_TEMPERATURE = 3.5;
    private static final double TEMPERATURE_RANGE = 3.0;
    private static final double MIN_HUMIDITY = 80.0;
    private static final double HUMIDITY_RANGE = 10.0;

    private final VendingMachineRepository vendingMachineRepository;
    private final TemperatureLogRepository temperatureLogRepository;

    @Override
    @Transactional(readOnly = true)
    public TemperatureLogResponse getLatest(Long machineId) {
        if (!vendingMachineRepository.existsById(machineId)) {
            throw new ResourceNotFoundException("Không tìm thấy máy bán hàng có id: " + machineId);
        }
        TemperatureLog log = temperatureLogRepository.findTopByMachineIdOrderByRecordedAtDescIdDesc(machineId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Máy bán hàng chưa có dữ liệu nhiệt độ: " + machineId
                ));
        return TemperatureLogResponse.from(log);
    }

    @Override
    @Transactional(readOnly = true)
    public List<TemperatureLogResponse> getHistory(Long machineId, int limit) {
        if (!vendingMachineRepository.existsById(machineId)) {
            throw new ResourceNotFoundException("Không tìm thấy máy bán hàng có id: " + machineId);
        }
        return temperatureLogRepository.findByMachineIdOrderByRecordedAtDescIdDesc(
                        machineId, PageRequest.of(0, limit))
                .stream()
                .map(TemperatureLogResponse::from)
                .toList();
    }

    @Override
    @Transactional
    public TemperatureLogResponse recordTemperature(Long machineId, double temperature, double humidity) {
        VendingMachine machine = findMachine(machineId);
        LocalDateTime recordedAt = LocalDateTime.now();
        machine.updateLastPingAt(recordedAt);
        vendingMachineRepository.save(machine);
        TemperatureLog log = temperatureLogRepository.save(
                new TemperatureLog(machine, temperature, humidity, recordedAt)
        );
        return TemperatureLogResponse.from(log);
    }

    @Override
    @Transactional
    public void captureOnlineMachines() {
        List<VendingMachine> onlineMachines = vendingMachineRepository.findByStatus(MachineStatus.ONLINE);
        LocalDateTime recordedAt = LocalDateTime.now();
        for (VendingMachine machine : onlineMachines) {
            double temperature = MIN_TEMPERATURE + ThreadLocalRandom.current().nextDouble(TEMPERATURE_RANGE);
            double humidity = MIN_HUMIDITY + ThreadLocalRandom.current().nextDouble(HUMIDITY_RANGE);
            machine.updateLastPingAt(recordedAt);
            temperatureLogRepository.save(new TemperatureLog(machine, temperature, humidity, recordedAt));
        }
    }

    @Override
    @Transactional
    public void togglePower(Long machineId) {
        VendingMachine machine = findMachine(machineId);
        if (machine.getStatus() != MachineStatus.ONLINE && machine.getStatus() != MachineStatus.OFFLINE) {
            throw new BusinessRuleException("Chỉ có thể bật/tắt máy đang ONLINE hoặc OFFLINE.");
        }
        machine.togglePower();
        vendingMachineRepository.save(machine);
    }

    private VendingMachine findMachine(Long machineId) {
        return vendingMachineRepository.findById(machineId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Không tìm thấy máy bán hàng có id: " + machineId
                ));
    }
}
