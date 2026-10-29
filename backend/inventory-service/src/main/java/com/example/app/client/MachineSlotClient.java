package com.example.app.client;

import com.example.app.dto.MachineSlotInventoryRequest;
import com.example.app.dto.MachineSlotInventoryResponse;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;

import java.util.List;

@FeignClient(name = "machine-coldchain-service")
public interface MachineSlotClient {

    @GetMapping("/internal/api/v1/slots/{slotId}")
    MachineSlotInventoryResponse getSlot(@PathVariable("slotId") Long slotId);

    @GetMapping("/api/v1/machines/{machineId}/slots")
    List<MachineRestockSlot> getMachineSlots(@PathVariable("machineId") Long machineId);

    @PatchMapping("/internal/api/v1/slots/{slotId}/stock")
    void updateStock(
            @PathVariable("slotId") Long slotId,
            @RequestBody MachineSlotInventoryRequest request
    );

    @JsonIgnoreProperties(ignoreUnknown = true)
    record MachineRestockSlot(Long slotId, String slotCode, Long productId, int capacity) {}
}
