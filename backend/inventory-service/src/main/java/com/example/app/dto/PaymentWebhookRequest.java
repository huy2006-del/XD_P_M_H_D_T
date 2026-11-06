package com.example.app.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import java.math.BigDecimal;

@Data
public class PaymentWebhookRequest {
    @NotBlank(message = "Order code is required")
    private String orderCode;

    @NotNull(message = "Amount is required")
    private BigDecimal amount;

    private String transactionNo;
    private String responseCode; // 00 = SUCCESS
}