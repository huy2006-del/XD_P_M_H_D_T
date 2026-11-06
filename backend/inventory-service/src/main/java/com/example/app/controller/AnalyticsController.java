package com.example.app.controller;

import com.example.app.dto.AnalyticsOverviewResponse;
import com.example.app.dto.DailyRevenueResponse;
import com.example.app.service.AnalyticsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/analytics")
@RequiredArgsConstructor
public class AnalyticsController {

    private final AnalyticsService analyticsService;

    @GetMapping("/overview")
    public ResponseEntity<AnalyticsOverviewResponse> getOverview() {
        return ResponseEntity.ok(analyticsService.getOverview());
    }

    @GetMapping("/revenue-chart")
    public ResponseEntity<List<DailyRevenueResponse>> getRevenueChart(
            @RequestParam(defaultValue = "7") int range) {
        return ResponseEntity.ok(analyticsService.getRevenueChart(range));
    }
}