package com.example.app.client;

import com.example.app.dto.MachineSlotInventoryRequest;
import com.example.app.dto.MachineSlotInventoryResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import java.util.List;

@FeignClient(name = "machine-coldchain-service")
public interface MachineSlotClient {

    record MachineLocation(Long id, Location location) {
        public record Location(Long id, String name) {}
    }

    @GetMapping("/api/v1/machines")
    List<MachineLocation> getMachineLocations();

    @GetMapping("/api/v1/machines/{machineId}")
    void requireMachine(@PathVariable("machineId") Long machineId);

    @GetMapping("/api/v1/machines/{machineId}/slots")
    List<MachineSlotInventoryResponse> getMachineSlots(@PathVariable("machineId") Long machineId);

    @GetMapping("/internal/api/v1/slots/{slotId}")
    MachineSlotInventoryResponse getSlot(@PathVariable("slotId") Long slotId);

    @PatchMapping("/internal/api/v1/slots/{slotId}/stock")
    void updateStock(
            @PathVariable("slotId") Long slotId,
            @RequestBody MachineSlotInventoryRequest request
    );
}
