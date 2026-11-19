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
