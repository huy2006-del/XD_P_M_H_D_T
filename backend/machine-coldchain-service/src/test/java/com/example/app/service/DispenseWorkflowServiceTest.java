package com.example.app.service;

import com.example.app.dto.request.DispenseRequestMessage;
import com.example.app.dto.response.DispenseFailureResult;
import com.example.app.entity.Alert;
import com.example.app.entity.DispenseOperation;
import com.example.app.entity.DispenseStatus;
import com.example.app.entity.MachineSlot;
import com.example.app.entity.MachineSlotStatus;
import com.example.app.entity.MachineStatus;
import com.example.app.entity.VendingMachine;
import com.example.app.exception.MotorJammedException;
import com.example.app.repository.AlertRepository;
import com.example.app.repository.DispenseOperationRepository;
import com.example.app.repository.MachineSlotRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DispenseWorkflowServiceTest {

    @Mock
    private MachineSlotRepository machineSlotRepository;
    @Mock
    private DispenseOperationRepository dispenseOperationRepository;
    @Mock
    private AlertRepository alertRepository;

    @InjectMocks
    private DispenseWorkflowService dispenseWorkflowService;

    @Test
    void terminalJamMarksSlotForMaintenanceAndPersistsFullRefundVoucher() {
        DispenseRequestMessage request = new DispenseRequestMessage("ORD-55", "12", "A1", true, 2);
        MachineSlot slot = org.mockito.Mockito.mock(MachineSlot.class);
        when(slot.getId()).thenReturn(33L);
        when(slot.getSlotCode()).thenReturn("A1");
        when(machineSlotRepository.findByMachineIdAndSlotCodeIgnoreCase(12L, "A1"))
                .thenReturn(Optional.of(slot));
        when(dispenseOperationRepository.findById("ORD-55")).thenReturn(Optional.empty());
        when(alertRepository.save(any(Alert.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(dispenseOperationRepository.save(any(DispenseOperation.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        DispenseFailureResult result = dispenseWorkflowService.recordTerminalJam(request);

        verify(slot).markForMaintenance();
        verify(machineSlotRepository).save(slot);
        ArgumentCaptor<DispenseOperation> operationCaptor = ArgumentCaptor.forClass(DispenseOperation.class);
        verify(dispenseOperationRepository).save(operationCaptor.capture());
        DispenseOperation operation = operationCaptor.getValue();
        assertEquals(DispenseStatus.JAMMED, operation.getStatus());
        assertEquals(3, operation.getRetryCount());
        assertEquals(100, operation.getRefundPercent());
        assertNotNull(operation.getRefundVoucherCode());
        assertTrue(operation.getRefundVoucherCode().startsWith("REFUND_VOUCHER_ORD-"));
        assertEquals("JAMMED", result.notification().status());
        assertEquals("MOTOR_JAM", result.alert().alertType());
    }

    @Test
    void operationalMachineWithHealthySlotPassesMotorCheck() {
        DispenseRequestMessage request = new DispenseRequestMessage("ORD-60", "12", "A1", false);
        mockSlot(MachineStatus.ONLINE, MachineSlotStatus.ACTIVE);

        assertDoesNotThrow(() -> dispenseWorkflowService.assertMotorOperational(request));
    }

    @Test
    void machineThatIsNotOnlineThrowsMotorJammed() {
        DispenseRequestMessage request = new DispenseRequestMessage("ORD-61", "12", "A1", false);
        mockSlot(MachineStatus.OUT_OF_ORDER, MachineSlotStatus.ACTIVE);

        assertThrows(MotorJammedException.class,
                () -> dispenseWorkflowService.assertMotorOperational(request));
    }

    @Test
    void jammedOrMaintenanceSlotThrowsMotorJammed() {
        DispenseRequestMessage request = new DispenseRequestMessage("ORD-62", "12", "A1", false);
        mockSlot(MachineStatus.ONLINE, MachineSlotStatus.MAINTENANCE);

        assertThrows(MotorJammedException.class,
                () -> dispenseWorkflowService.assertMotorOperational(request));
    }

    private void mockSlot(MachineStatus machineStatus, MachineSlotStatus slotStatus) {
        VendingMachine machine = org.mockito.Mockito.mock(VendingMachine.class);
        when(machine.getStatus()).thenReturn(machineStatus);
        MachineSlot slot = org.mockito.Mockito.mock(MachineSlot.class);
        when(slot.getMachine()).thenReturn(machine);
        org.mockito.Mockito.lenient().when(slot.getStatus()).thenReturn(slotStatus);
        org.mockito.Mockito.lenient().when(slot.getSlotCode()).thenReturn("A1");
        when(machineSlotRepository.findByMachineIdAndSlotCodeIgnoreCase(12L, "A1"))
                .thenReturn(Optional.of(slot));
    }
}
