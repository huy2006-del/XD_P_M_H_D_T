package com.example.app.dto;

import lombok.Builder;
import lombok.Data;
import java.math.BigDecimal;

@Data
@Builder
public class OrderItemResponse {
    private Long id;
    private Long productId;
    private Integer slotNumber;
    private Integer quantity;
    private BigDecimal unitPrice;
    private BigDecimal subtotal;
}