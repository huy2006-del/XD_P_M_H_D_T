package com.example.app.service;

import com.example.app.dto.OrderPaidEvent;
import com.example.app.dto.OrderResponse;
import com.example.app.dto.PaymentWebhookRequest;
import com.example.app.entity.Order;
import com.example.app.entity.PaymentStatus;
import com.example.app.repository.OrderRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class PaymentService {

    private final OrderRepository orderRepository;
    private final RabbitTemplate rabbitTemplate;
    private final OrderService orderService;

    @Value("${rabbitmq.exchange.order:freshvend.order.exchange}")
    private String exchange;

    @Value("${rabbitmq.routing.key.paid:order.paid}")
    private String routingKey;

    @Transactional
    public OrderResponse processWebhook(PaymentWebhookRequest request) {
        Order order = orderRepository.findByOrderCode(request.getOrderCode())
                .orElseThrow(() -> new RuntimeException("Order not found: " + request.getOrderCode()));

        // Tránh xử lý lại nếu đơn hàng đã được cập nhật thành công trước đó
        if (order.getPaymentStatus() == PaymentStatus.SUCCESS) {
            return orderService.getOrderByCode(order.getOrderCode());
        }

        // 1. Cập nhật trạng thái thanh toán
        order.setPaymentStatus(PaymentStatus.SUCCESS);
        orderRepository.save(order);

        // 2. Bắn Event vào RabbitMQ
        OrderPaidEvent paidEvent = OrderPaidEvent.builder()
                .orderId(order.getId())
                .orderCode(order.getOrderCode())
                .machineId(order.getMachineId())
                .totalAmount(order.getTotalAmount())
                .paidAt(LocalDateTime.now())
                .build();

        rabbitTemplate.convertAndSend(exchange, routingKey, paidEvent);

        return orderService.getOrderByCode(order.getOrderCode());
    }
}