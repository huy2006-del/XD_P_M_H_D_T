package com.example.app.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class VirtualIoTSimulator {

    private final TelemetryService telemetryService;

    @Scheduled(fixedRate = 10_000)
    public void generateTelemetry() {
        telemetryService.captureOnlineMachines();
        log.info("📡 [Virtual-IoT Simulator] Đang quét và sinh dữ liệu telemetry định kỳ (10s) cho các máy ONLINE...");
    }
}
