package com.example.app.controller;

import com.example.app.dto.MachineRequest;
import com.example.app.dto.MachineResponse;
import com.example.app.dto.MachineStatusRequest;
import com.example.app.entity.MachineStatus;
import com.example.app.service.VendingMachineService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/machines")
public class VendingMachineController {

    private final VendingMachineService machineService;

    public VendingMachineController(VendingMachineService machineService) {
        this.machineService = machineService;
    }

    @GetMapping
    public List<MachineResponse> getAll(
            @RequestParam(required = false) MachineStatus status,
            @RequestParam(required = false) Long locationId
    ) {
        return machineService.getAll(status, locationId);
    }

    @GetMapping("/{id}")
    public MachineResponse getById(@PathVariable Long id) {
        return machineService.getById(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public MachineResponse create(@Valid @RequestBody MachineRequest request) {
        return machineService.create(request);
    }

    @PutMapping("/{id}")
    public MachineResponse update(@PathVariable Long id, @Valid @RequestBody MachineRequest request) {
        return machineService.update(id, request);
    }

    @PatchMapping("/{id}/status")
    public MachineResponse updateStatus(
            @PathVariable Long id,
            @Valid @RequestBody MachineStatusRequest request
    ) {
        return machineService.updateStatus(id, request.status());
    }
}
