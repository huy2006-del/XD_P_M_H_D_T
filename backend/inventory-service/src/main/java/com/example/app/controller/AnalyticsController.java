package com.example.app.controller;

import com.example.app.dto.AnalyticsOverviewResponse;
import com.example.app.dto.DailyRevenueResponse;
import com.example.app.dto.PeakHourRevenueResponse;
import com.example.app.dto.ProductRevenueResponse;
import com.example.app.service.AnalyticsService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/v1/analytics")
@RequiredArgsConstructor
public class AnalyticsController {

    private final AnalyticsService analyticsService;

    @GetMapping("/overview")
    public ResponseEntity<AnalyticsOverviewResponse> getOverview(
            @RequestParam(required = false) Long machineId,
            @RequestParam(required = false) Long productId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ResponseEntity.ok(analyticsService.getOverview(machineId, productId, from, to));
    }

    @GetMapping("/revenue-chart")
    public ResponseEntity<List<DailyRevenueResponse>> getRevenueChart(
            @RequestParam(defaultValue = "7") int range,
            @RequestParam(required = false) Long machineId,
            @RequestParam(required = false) Long productId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ResponseEntity.ok(analyticsService.getRevenueChart(range, machineId, productId, from, to));
    }

    @GetMapping("/revenue-by-location")
    public ResponseEntity<List<AnalyticsService.LocationRevenue>> getRevenueByLocation(
            @RequestParam(required = false) Long locationId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ResponseEntity.ok(analyticsService.getRevenueByLocation(locationId, from, to));
    }

    @GetMapping("/revenue-by-product")
    public ResponseEntity<List<ProductRevenueResponse>> getRevenueByProduct(
            @RequestParam(required = false) Long machineId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ResponseEntity.ok(analyticsService.getRevenueByProduct(machineId, from, to));
    }

    @GetMapping("/peak-hours")
    public ResponseEntity<List<PeakHourRevenueResponse>> getPeakHours(
            @RequestParam(required = false) Long machineId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ResponseEntity.ok(analyticsService.getPeakHours(machineId, from, to));
    }
}
