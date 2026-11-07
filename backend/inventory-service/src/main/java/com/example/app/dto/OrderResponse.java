package com.example.app.dto;

import com.example.app.entity.DispenseStatus;
import com.example.app.entity.PaymentMethod;
import com.example.app.entity.PaymentStatus;
import lombok.Builder;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class OrderResponse {
    private Long id;
    private String orderCode;
    private Long machineId;
    private BigDecimal totalAmount;
    private PaymentMethod paymentMethod;
    private PaymentStatus paymentStatus;
    private DispenseStatus dispenseStatus;
    private LocalDateTime createdAt;
    private List<OrderItemResponse> items;
    private String qrCodeUrl;
    private String refundVoucherCode;
}