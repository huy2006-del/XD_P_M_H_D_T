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
     * DISPENSED → đơn hoàn tất; JAMMED → đơn kẹt hàng, lưu mã voucher hoàn tiền cho khách.
     * Chỉ chuyển từ PENDING (hoặc lặp lại cùng trạng thái) để tránh ghi đè kết quả cũ.
     */
    @Transactional
    public void applyDispenseResult(DispenseResultEvent event) {
        Optional<Order> found = findOrderByReference(event.orderId());
        if (found.isEmpty()) {
            log.warn("[DISPENSE RESULT] Không tìm thấy đơn '{}', bỏ qua kết quả {}.",
                    event.orderId(), event.status());
            return;
        }

        DispenseStatus target;
        try {
            target = DispenseStatus.valueOf(event.status());
        } catch (IllegalArgumentException | NullPointerException exception) {
            log.warn("[DISPENSE RESULT] Trạng thái không hợp lệ '{}' cho đơn {}.", event.status(), event.orderId());
            return;
        }
        if (target != DispenseStatus.DISPENSED && target != DispenseStatus.JAMMED) {
            log.warn("[DISPENSE RESULT] Bỏ qua trạng thái {} cho đơn {}.", target, event.orderId());
            return;
        }

        Order order = found.get();
        if (order.getDispenseStatus() != DispenseStatus.PENDING && order.getDispenseStatus() != target) {
            log.warn("[DISPENSE RESULT] Đơn {} đang {}, không ghi đè bằng {}.",
                    order.getOrderCode(), order.getDispenseStatus(), target);
            return;
        }

        order.setDispenseStatus(target);
        if (target == DispenseStatus.JAMMED && event.refundVoucherCode() != null) {
            order.setRefundVoucherCode(event.refundVoucherCode());
        }
        orderRepository.save(order);
        log.info("[DISPENSE RESULT] Đơn {} → {}{}", order.getOrderCode(), target,
                order.getRefundVoucherCode() != null ? ", voucher=" + order.getRefundVoucherCode() : "");
    }

    private Optional<Order> findOrderByReference(String reference) {
        if (reference == null || reference.isBlank()) {
            return Optional.empty();
        }
        Optional<Order> byCode = orderRepository.findByOrderCode(reference);
        if (byCode.isPresent() || !reference.chars().allMatch(Character::isDigit)) {
            return byCode;
        }
        try {
            return orderRepository.findById(Long.parseLong(reference));
        } catch (NumberFormatException exception) {
            return Optional.empty();
        }
    }

    private String generateOrderCode() {
        String dateStr = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        long count = orderRepository.countTodayOrders() + 1;
        return String.format("ORD-%s-%04d", dateStr, count);
    }

    private OrderResponse mapToResponse(Order order) {
        List<OrderItemResponse> itemResponses = order.getItems().stream()
                .map(item -> OrderItemResponse.builder()
                        .id(item.getId())
                        .productId(item.getProductId())
                        .slotNumber(item.getSlotNumber())
                        .quantity(item.getQuantity())
                        .unitPrice(item.getUnitPrice())
                        .subtotal(item.getSubtotal())
                        .build())
                .collect(Collectors.toList());

        return OrderResponse.builder()
                .id(order.getId())
                .orderCode(order.getOrderCode())
                .machineId(order.getMachineId())
                .totalAmount(order.getTotalAmount())
                .paymentMethod(order.getPaymentMethod())
                .paymentStatus(order.getPaymentStatus())
                .dispenseStatus(order.getDispenseStatus())
                .createdAt(order.getCreatedAt())
                .items(itemResponses)
                .refundVoucherCode(order.getRefundVoucherCode())
                .qrCodeUrl(vietQRService.generateQrUrl(order.getOrderCode(), order.getTotalAmount())) // <-- 2. Sinh URL VietQR động ở đây
                .build();
    }
}