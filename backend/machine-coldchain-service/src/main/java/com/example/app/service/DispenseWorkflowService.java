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
import com.example.app.entity.MachineSlotStatus;
import com.example.app.entity.MachineStatus;
import com.example.app.exception.BusinessRuleException;
import com.example.app.exception.MotorJammedException;
import com.example.app.exception.ResourceNotFoundException;
import com.example.app.repository.AlertRepository;
import com.example.app.repository.DispenseOperationRepository;
import com.example.app.repository.MachineSlotRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class DispenseWorkflowService {

    private final MachineSlotRepository machineSlotRepository;
    private final DispenseOperationRepository dispenseOperationRepository;
    private final AlertRepository alertRepository;

    @Transactional(readOnly = true)
    public Optional<DispenseNotification> completedNotification(DispenseRequestMessage request) {
        if (request == null || request.orderId() == null) {
            return Optional.empty();
        }
        String compositeId = buildOperationId(request);
        long machineId;
        MachineSlot slot;
        try {
            machineId = parseMachineId(request.machineId());
            slot = findSlot(machineId, request.slotId());
        } catch (RuntimeException ex) {
            // An invalid or unknown slot is not evidence that this order/slot was
            // already dispensed. Let normal validation report the underlying error.
            return Optional.empty();
        }

        Optional<DispenseOperation> existing = dispenseOperationRepository.findById(compositeId)
                .filter(operation -> matchesRequestSlot(operation, machineId, slot.getId()));
        if (existing.isEmpty()) {
            existing = dispenseOperationRepository.findById(request.orderId())
                    .filter(operation -> matchesRequestSlot(operation, machineId, slot.getId()));
        }
        return existing.map(operation -> new DispenseNotification(
                request.orderId(), operation.getMachineId(), operation.getSlotId(),
                operation.getStatus().name(),
                operation.getStatus() == DispenseStatus.JAMMED
                        ? "Motor bị kẹt sau 3 lần thử; khay cần bảo trì."
                        : "Nhả hàng thành công, mời nhận trái cây.",
                operation.getRefundVoucherCode(), operation.getRefundPercent()));
    }

    private boolean matchesRequestSlot(DispenseOperation operation, long machineId, Long slotId) {
        return operation.getMachineId() != null
                && operation.getMachineId() == machineId
                && operation.getSlotId() != null
                && operation.getSlotId().equals(slotId);
    }

    private String buildOperationId(DispenseRequestMessage request) {
        try {
            long machineId = parseMachineId(request.machineId());
            MachineSlot slot = findSlot(machineId, request.slotId());
            return request.orderId() + ":" + slot.getId();
        } catch (RuntimeException ex) {
            return request.orderId() + ":" + request.slotId();
        }
    }

    /**
     * Kiểm tra trạng thái cơ khí sau khi motor quay: máy không ONLINE (lỗi / OUT_OF_ORDER / bảo trì / offline)
     * hoặc khay đang JAMMED / MAINTENANCE thì coi như kẹt hàng.
     *
     * @throws MotorJammedException khi máy hoặc khay không thể nhả hàng
     */
    @Transactional(readOnly = true)
    public void assertMotorOperational(DispenseRequestMessage request) {
        long machineId = parseMachineId(request.machineId());
        MachineSlot slot = findSlot(machineId, request.slotId());
        MachineStatus machineStatus = slot.getMachine().getStatus();
        if (machineStatus != MachineStatus.ONLINE) {
            throw new MotorJammedException(
                    "Máy " + machineId + " đang ở trạng thái " + machineStatus + ", không thể nhả hàng.");
        }
        MachineSlotStatus slotStatus = slot.getStatus();
        if (slotStatus == MachineSlotStatus.JAMMED || slotStatus == MachineSlotStatus.MAINTENANCE) {
            throw new MotorJammedException(
                    "Khay " + slot.getSlotCode() + " đang ở trạng thái " + slotStatus + ", không thể nhả hàng.");
        }
    }

    @Transactional
    public DispenseNotification recordDispensed(DispenseRequestMessage request) {
        long machineId = parseMachineId(request.machineId());
        MachineSlot slot = findSlot(machineId, request.slotId());
        String operationId = request.orderId() + ":" + slot.getId();
        DispenseOperation operation = new DispenseOperation(
                operationId, machineId, slot.getId(), request.retryCount());
        dispenseOperationRepository.save(operation);
        return new DispenseNotification(
                request.orderId(), machineId, slot.getId(), DispenseStatus.DISPENSED.name(),
                "Nhả hàng thành công, mời nhận trái cây.", null, null);
    }

    @Transactional
    public DispenseFailureResult recordTerminalJam(DispenseRequestMessage request) {
        long machineId = parseMachineId(request.machineId());
        MachineSlot slot = findSlot(machineId, request.slotId());
        String operationId = request.orderId() + ":" + slot.getId();

        DispenseOperation operation = dispenseOperationRepository.findById(operationId)
                .or(() -> dispenseOperationRepository.findById(request.orderId()))
                .orElseGet(() -> new DispenseOperation(
                        operationId, machineId, slot.getId(), request.retryCount()));
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
                    jamNotification(request.orderId(), operation), AlertResponse.from(alert));
        }

        Alert alert = alertRepository.findById(operation.getAlertId())
                .orElseThrow(() -> new IllegalStateException(
                        "Dispense operation is JAMMED but its motor-jam alert is missing"));
        return new DispenseFailureResult(jamNotification(request.orderId(), operation), AlertResponse.from(alert));
    }

    private DispenseNotification jamNotification(String canonicalOrderId, DispenseOperation operation) {
        return new DispenseNotification(
                canonicalOrderId, operation.getMachineId(), operation.getSlotId(),
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
