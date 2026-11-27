package com.example.app.service;

import com.example.app.config.RabbitConfig;
import com.example.app.dto.OrderPaidEvent;
import com.example.app.dto.OrderResponse;
import com.example.app.dto.PaymentWebhookRequest;
import com.example.app.entity.Order;
import com.example.app.entity.OrderItem;
import com.example.app.entity.PaymentStatus;
import com.example.app.repository.OrderRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.Map;
import java.util.Set;

@Slf4j
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
        Order order = orderRepository.findByOrderCodeForUpdate(request.getOrderCode())
                .orElseThrow(() -> new RuntimeException("Order not found: " + request.getOrderCode()));

        // Tránh xử lý lại nếu đơn hàng đã được cập nhật thành công trước đó
        if (order.getPaymentStatus() == PaymentStatus.SUCCESS) {
            return orderService.getOrderByCode(order.getOrderCode());
        }

        if (request.getResponseCode() != null
                && !request.getResponseCode().isBlank()
                && !"00".equals(request.getResponseCode())
                && !"SUCCESS".equalsIgnoreCase(request.getResponseCode())) {
            order.setPaymentStatus(PaymentStatus.FAILED);
            orderRepository.save(order);
            return orderService.getOrderByCode(order.getOrderCode());
        }

        // 1. Cập nhật trạng thái thanh toán
        order.setPaymentStatus(PaymentStatus.SUCCESS);
        orderRepository.save(order);

        // 2. Bắn Event OrderPaid vào RabbitMQ
        OrderPaidEvent paidEvent = OrderPaidEvent.builder()
                .orderId(order.getId())
                .orderCode(order.getOrderCode())
                .machineId(order.getMachineId())
                .totalAmount(order.getTotalAmount())
                .paidAt(LocalDateTime.now())
                .build();

        rabbitTemplate.convertAndSend(exchange, routingKey, paidEvent);

        // 3. Tự động phát lệnh nhả hàng (Dispense Command) cho từng khay trong đơn hàng
        Set<Integer> distinctSlots = new LinkedHashSet<>();
        if (order.getItems() != null) {
            for (OrderItem item : order.getItems()) {
                if (item.getSlotNumber() != null) {
                    distinctSlots.add(item.getSlotNumber());
                }
            }
        }

        for (Integer slotNumber : distinctSlots) {
            Map<String, Object> dispenseCommand = new LinkedHashMap<>();
            dispenseCommand.put("orderId", order.getOrderCode());
            dispenseCommand.put("machineId", String.valueOf(order.getMachineId()));
            dispenseCommand.put("slotId", String.valueOf(slotNumber));
            dispenseCommand.put("simulateJam", request.isSimulateJam());
            dispenseCommand.put("retryCount", 0);

            rabbitTemplate.convertAndSend(
                    RabbitConfig.DIRECT_EXCHANGE_NAME,
                    RabbitConfig.DISPENSE_ROUTING_KEY,
                    dispenseCommand
            );
            log.info("[ORDER PAID -> DISPENSE QUEUED] orderCode={}, machineId={}, slotId={}, simulateJam={}",
                    order.getOrderCode(), order.getMachineId(), slotNumber, request.isSimulateJam());
        }

        return orderService.getOrderByCode(order.getOrderCode());
    }
}