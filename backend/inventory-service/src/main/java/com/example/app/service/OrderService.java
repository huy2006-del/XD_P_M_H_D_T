package com.example.app.service;

import com.example.app.dto.CreateOrderRequest;
import com.example.app.dto.DispenseResultEvent;
import com.example.app.dto.OrderItemResponse;
import com.example.app.dto.OrderItemRequest;
import com.example.app.dto.OrderResponse;
import com.example.app.entity.*;
import com.example.app.repository.OrderRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class OrderService {

    private final OrderRepository orderRepository;
    private final VietQRService vietQRService; // <-- 1. Inject VietQRService vào đây

    @Transactional
    public OrderResponse createOrder(CreateOrderRequest request) {
        String orderCode = generateOrderCode();

        BigDecimal totalAmount = BigDecimal.ZERO;

        Order order = Order.builder()
                .orderCode(orderCode)
                .machineId(request.getMachineId())
                .paymentMethod(request.getPaymentMethod())
                .paymentStatus(PaymentStatus.PENDING)
                .dispenseStatus(DispenseStatus.PENDING)
                .build();

        for (OrderItemRequest itemReq : request.getItems()) {
            BigDecimal subtotal = itemReq.getUnitPrice().multiply(BigDecimal.valueOf(itemReq.getQuantity()));
            totalAmount = totalAmount.add(subtotal);

            OrderItem item = OrderItem.builder()
                    .productId(itemReq.getProductId())
                    .slotNumber(itemReq.getSlotNumber())
                    .quantity(itemReq.getQuantity())
                    .unitPrice(itemReq.getUnitPrice())
                    .subtotal(subtotal)
                    .build();

            order.addItem(item);
        }

        order.setTotalAmount(totalAmount);
        Order savedOrder = orderRepository.save(order);

        return mapToResponse(savedOrder);
    }

    @Transactional(readOnly = true)
    public OrderResponse getOrderById(Long id) {
        Order order = orderRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Order not found with id: " + id));
        return mapToResponse(order);
    }

    @Transactional(readOnly = true)
    public OrderResponse getOrderByCode(String orderCode) {
        Order order = orderRepository.findByOrderCode(orderCode)
                .orElseThrow(() -> new RuntimeException("Order not found with code: " + orderCode));
        return mapToResponse(order);
    }

    @Transactional(readOnly = true)
    public List<OrderResponse> getAllOrders() {
        return orderRepository.findAll().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    /**
     * Áp kết quả nhả hàng do machine-coldchain-service báo về:
     * DISPENSED → đơn COMPLETED; JAMMED → đơn kẹt hàng, lưu mã voucher hoàn tiền cho khách.
