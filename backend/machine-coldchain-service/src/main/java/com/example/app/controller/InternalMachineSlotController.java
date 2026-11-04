package com.example.app.controller;

import com.example.app.dto.MachineSlotInventoryRequest;
import com.example.app.dto.MachineSlotInventoryResponse;
import com.example.app.entity.MachineSlot;
import com.example.app.exception.ResourceNotFoundException;
import com.example.app.repository.MachineSlotRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.transaction.annotation.Transactional;

@RestController
@RequiredArgsConstructor
@RequestMapping("/internal/api/v1/slots")
public class InternalMachineSlotController {

    private final MachineSlotRepository machineSlotRepository;

    @GetMapping("/{slotId}")
    @Transactional(readOnly = true)
    public MachineSlotInventoryResponse getSlot(@PathVariable Long slotId) {
        MachineSlot slot = findSlot(slotId);
        return new MachineSlotInventoryResponse(
                slot.getId(),
                slot.getProductId(),
                slot.getCapacity(),
                slot.getCurrentStock(),
                slot.getStatus().name()
        );
    }

    @PatchMapping("/{slotId}/stock")
    @Transactional
    public void updateStock(
            @PathVariable Long slotId,
            @RequestBody MachineSlotInventoryRequest request
    ) {
        MachineSlot slot = findSlot(slotId);
        slot.updateStock(request.currentStock());
        machineSlotRepository.save(slot);
    }

    private MachineSlot findSlot(Long slotId) {
        return machineSlotRepository.findById(slotId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy khay hàng có id: " + slotId));
    }
}
