package com.example.app.controller;

import com.example.app.dto.request.MachineSlotRequest;
import com.example.app.dto.request.MachineSlotStatusRequest;
import com.example.app.dto.response.MachineSlotResponse;
import com.example.app.service.MachineSlotService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1")
public class MachineSlotController {

    private final MachineSlotService machineSlotService;

    @GetMapping("/machines/{machineId}/slots")
    public ResponseEntity<List<MachineSlotResponse>> getMachineSlots(@PathVariable Long machineId) {
        return ResponseEntity.ok(machineSlotService.getMachineSlots(machineId));
    }

    @PostMapping("/machines/{machineId}/slots")
    public ResponseEntity<MachineSlotResponse> createMachineSlot(
            @PathVariable Long machineId,
            @Valid @RequestBody MachineSlotRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(machineSlotService.createMachineSlot(machineId, request));
    }

    @PutMapping("/slots/{slotId}")
    public ResponseEntity<MachineSlotResponse> updateMachineSlot(
            @PathVariable Long slotId,
            @Valid @RequestBody MachineSlotRequest request
    ) {
        return ResponseEntity.ok(machineSlotService.updateMachineSlot(slotId, request));
    }

    @PatchMapping("/slots/{slotId}/status")
    public ResponseEntity<MachineSlotResponse> updateMachineSlotStatus(
            @PathVariable Long slotId,
            @Valid @RequestBody MachineSlotStatusRequest request
    ) {
        return ResponseEntity.ok(machineSlotService.updateMachineSlotStatus(slotId, request));
    }

    @DeleteMapping("/slots/{slotId}")
    public ResponseEntity<Void> deleteMachineSlot(@PathVariable Long slotId) {
        machineSlotService.deleteMachineSlot(slotId);
        return ResponseEntity.noContent().build();
    }
}
