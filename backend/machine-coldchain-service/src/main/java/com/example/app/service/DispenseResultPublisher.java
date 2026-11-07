package com.example.app.service;

import com.example.app.config.RabbitMQConfig;
import com.example.app.dto.event.DispenseResultEvent;
import com.example.app.dto.response.DispenseNotification;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Component;

/**
 * Báo kết quả nhả hàng (DISPENSED / JAMMED + voucher hoàn tiền) cho inventory-service,
 * nơi sở hữu bảng orders. Lỗi publish chỉ được log, không làm hỏng luồng nhả hàng.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class DispenseResultPublisher {

    private final RabbitTemplate rabbitTemplate;

    public void publish(DispenseNotification notification) {
        DispenseResultEvent event = new DispenseResultEvent(
                notification.orderId(),
                notification.machineId(),
                notification.slotId(),
                notification.status(),
                notification.refundVoucherCode(),
                notification.refundPercent());
        try {
            rabbitTemplate.convertAndSend(
                    RabbitMQConfig.ORDER_EXCHANGE,
                    RabbitMQConfig.DISPENSE_RESULT_ROUTING_KEY,
                    event);
            log.info("[ORDER RESULT PUBLISHED] orderId={}, status={}", event.orderId(), event.status());
        } catch (RuntimeException exception) {
            log.error("[ORDER RESULT PUBLISH FAILED] orderId={}, status={}",
                    event.orderId(), event.status(), exception);
        }
    }
}
