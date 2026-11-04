package com.example.app.controller;

import com.example.app.dto.request.AlertResolveRequest;
import com.example.app.dto.response.AlertResponse;
import com.example.app.entity.AlertSeverity;
import com.example.app.entity.AlertStatus;
import com.example.app.service.AlertService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/alerts")
public class AlertController {

    private final AlertService alertService;

    @GetMapping
    public List<AlertResponse> getAlerts(
            @RequestParam(required = false) AlertStatus status,
            @RequestParam(required = false) AlertSeverity severity,
            @RequestParam(required = false) Long machineId
    ) {
        return alertService.getAlerts(status, severity, machineId);
    }

    @PatchMapping("/{id}/acknowledge")
    public ResponseEntity<AlertResponse> acknowledge(@PathVariable Long id) {
        return ResponseEntity.ok(alertService.acknowledge(id));
    }

    @PatchMapping("/{id}/resolve")
    public ResponseEntity<AlertResponse> resolve(
            @PathVariable Long id,
            @Valid @RequestBody AlertResolveRequest request
    ) {
        return ResponseEntity.ok(alertService.resolve(id, request.resolvedBy(), request.resolutionNote()));
    }
}
