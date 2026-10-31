package com.example.app.service;

import com.example.app.dto.request.MachineRequest;
import com.example.app.dto.response.MachineResponse;
import com.example.app.entity.MachineStatus;

import java.util.List;

public interface VendingMachineService {
    List<MachineResponse> getAll(MachineStatus status, Long locationId);

    MachineResponse getById(Long id);

    MachineResponse create(MachineRequest request);

    MachineResponse update(Long id, MachineRequest request);

    MachineResponse updateStatus(Long id, MachineStatus status);
}
