package com.example.app.service;

import com.example.app.dto.request.MachineSlotRequest;
import com.example.app.dto.request.MachineSlotStatusRequest;
import com.example.app.dto.response.MachineSlotResponse;

import java.util.List;

public interface MachineSlotService {
    List<MachineSlotResponse> getMachineSlots(Long machineId);

    MachineSlotResponse createMachineSlot(Long machineId, MachineSlotRequest request);

    MachineSlotResponse updateMachineSlot(Long slotId, MachineSlotRequest request);

    MachineSlotResponse updateMachineSlotStatus(Long slotId, MachineSlotStatusRequest request);

    void deleteMachineSlot(Long slotId);
}
