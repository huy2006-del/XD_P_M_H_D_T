package com.example.app.controller;

import com.example.app.dto.OrderResponse;
import com.example.app.dto.PaymentWebhookRequest;
import com.example.app.service.PaymentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/payments")
@RequiredArgsConstructor
public class PaymentController {

    private final PaymentService paymentService;

    @PostMapping("/webhook")
    public ResponseEntity<OrderResponse> handleWebhook(@Valid @RequestBody PaymentWebhookRequest request) {
        return ResponseEntity.ok(paymentService.processWebhook(request));
    }
}