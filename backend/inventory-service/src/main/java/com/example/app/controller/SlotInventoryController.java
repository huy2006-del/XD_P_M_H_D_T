package com.example.app.controller;

import com.example.app.dto.DispenseRequest;
import com.example.app.dto.DispenseResultDTO;
import com.example.app.dto.LoadSlotRequest;
import com.example.app.dto.SlotInventoryItem;
import com.example.app.service.InventoryService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import java.util.List;

@RestController
@RequestMapping("/api/v1/slots/{slotId}")
public class SlotInventoryController {
    private final InventoryService service;

    public SlotInventoryController(InventoryService service) { this.service = service; }

    @GetMapping("/inventory")
    public List<SlotInventoryItem> inventory(@PathVariable Long slotId) { return service.getSlotInventory(slotId); }

    @PostMapping("/batches")
    @ResponseStatus(HttpStatus.CREATED)
    public SlotInventoryItem load(@PathVariable Long slotId, @Valid @RequestBody LoadSlotRequest request) {
        return service.loadToSlot(slotId, request.batchId(), request.quantity());
    }

    @PostMapping("/dispense")
    public DispenseResultDTO dispense(@PathVariable Long slotId, @Valid @RequestBody DispenseRequest request) {
        return service.dispenseFIFO(slotId, request.quantity());
    }
}
