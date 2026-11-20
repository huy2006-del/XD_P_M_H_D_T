package com.example.app.controller;

import com.example.app.dto.response.ColdChainHealthReportResponse;
import com.example.app.service.ColdChainReportService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/reports")
public class ColdChainReportController {

    private final ColdChainReportService coldChainReportService;

    @GetMapping("/coldchain-health")
    public ResponseEntity<ColdChainHealthReportResponse> getColdChainHealthReport() {
        return ResponseEntity.ok(coldChainReportService.getColdChainHealthReport());
    }
}
