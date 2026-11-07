package com.example.app.service;

import com.example.app.dto.request.DispenseRequestMessage;
import com.example.app.dto.response.AlertResponse;
import com.example.app.dto.response.DispenseFailureResult;
import com.example.app.dto.response.DispenseNotification;
import com.example.app.entity.Alert;
import com.example.app.entity.AlertSeverity;
import com.example.app.entity.AlertType;
import com.example.app.entity.DispenseOperation;
import com.example.app.entity.DispenseStatus;
import com.example.app.entity.MachineSlot;
import com.example.app.exception.BusinessRuleException;
import com.example.app.exception.ResourceNotFoundException;
import com.example.app.repository.AlertRepository;
import com.example.app.repository.DispenseOperationRepository;
import com.example.app.repository.MachineSlotRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class DispenseWorkflowService {

    private final MachineSlotRepository machineSlotRepository;
    private final DispenseOperationRepository dispenseOperationRepository;
    private final AlertRepository alertRepository;

    @Transactional(readOnly = true)
    public boolean isCompleted(String orderId) {
        return dispenseOperationRepository.existsById(orderId);
    }

    @Transactional
    public DispenseNotification recordDispensed(DispenseRequestMessage request) {
        long machineId = parseMachineId(request.machineId());
        MachineSlot slot = findSlot(machineId, request.slotId());
        DispenseOperation operation = new DispenseOperation(
                request.orderId(), machineId, slot.getId(), request.retryCount());
        dispenseOperationRepository.save(operation);
        return new DispenseNotification(
                request.orderId(), machineId, slot.getId(), DispenseStatus.DISPENSED.name(),
                "Nhả hàng thành công, mời nhận trái cây.", null, null);
    }

    @Transactional
    public DispenseFailureResult recordTerminalJam(DispenseRequestMessage request) {
        long machineId = parseMachineId(request.machineId());
        MachineSlot slot = findSlot(machineId, request.slotId());

        DispenseOperation operation = dispenseOperationRepository.findById(request.orderId())
                .orElseGet(() -> new DispenseOperation(
                        request.orderId(), machineId, slot.getId(), request.retryCount()));
        if (operation.getStatus() != DispenseStatus.JAMMED) {
            slot.markForMaintenance();
            machineSlotRepository.save(slot);

            String voucherCode = "REFUND_VOUCHER_ORD-" + UUID.randomUUID().toString()
                    .replace("-", "").substring(0, 12).toUpperCase();
            Alert alert = alertRepository.save(new Alert(
                    machineId,
                    AlertType.MOTOR_JAM,
                    AlertSeverity.CRITICAL,
                    "Đơn " + request.orderId() + " bị kẹt motor sau 3 lần thử; khay "
                            + slot.getSlotCode() + " đã chuyển sang bảo trì.",
                    LocalDateTime.now()
            ));
            operation.markJammed(request.retryCount() + 1, voucherCode, alert.getId());
            dispenseOperationRepository.save(operation);
            return new DispenseFailureResult(
                    jamNotification(operation, slot), AlertResponse.from(alert));
        }

        Alert alert = alertRepository.findById(operation.getAlertId())
                .orElseThrow(() -> new IllegalStateException(
                        "Dispense operation is JAMMED but its motor-jam alert is missing"));
        return new DispenseFailureResult(jamNotification(operation, slot), AlertResponse.from(alert));
    }

    private DispenseNotification jamNotification(DispenseOperation operation, MachineSlot slot) {
        return new DispenseNotification(
                operation.getOrderId(), operation.getMachineId(), operation.getSlotId(),
                DispenseStatus.JAMMED.name(),
                "Motor bị kẹt sau 3 lần thử; khay cần bảo trì.",
                operation.getRefundVoucherCode(), operation.getRefundPercent());
    }

    private MachineSlot findSlot(long machineId, String slotId) {
        try {
            long id = Long.parseLong(slotId);
            return machineSlotRepository.findByIdAndMachineId(id, machineId)
                    .orElseGet(() -> machineSlotRepository.findByMachineIdAndSlotCodeIgnoreCase(machineId, slotId)
                            .orElseThrow(() -> new ResourceNotFoundException(
                                    "Không tìm thấy slot " + slotId + " trên máy " + machineId)));
        } catch (NumberFormatException exception) {
            return machineSlotRepository.findByMachineIdAndSlotCodeIgnoreCase(machineId, slotId)
                    .orElseThrow(() -> new ResourceNotFoundException(
                            "Không tìm thấy slot " + slotId + " trên máy " + machineId));
        }
    }

    private long parseMachineId(String machineId) {
        try {
            return Long.parseLong(machineId);
        } catch (NumberFormatException exception) {
            throw new BusinessRuleException("machineId phải là ID số của máy bán hàng.");
        }
    }
}
