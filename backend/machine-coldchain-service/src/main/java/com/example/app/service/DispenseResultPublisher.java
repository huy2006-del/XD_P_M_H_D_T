package com.example.app.service;

import java.util.UUID;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;

import com.example.app.config.RabbitMQConfig;
import com.example.app.dto.event.DispenseResultEvent;
import com.example.app.dto.response.DispenseNotification;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.AmqpException;
import org.springframework.amqp.rabbit.connection.CorrelationData;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Component;

/**
 * Báo kết quả nhả hàng (DISPENSED / JAMMED + voucher hoàn tiền) cho inventory-service,
 * nơi sở hữu bảng orders. Lỗi publish được truyền lên consumer để lệnh được giao lại.
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
        CorrelationData correlation = new CorrelationData(UUID.randomUUID().toString());
        try {
            rabbitTemplate.convertAndSend(
                    RabbitMQConfig.ORDER_EXCHANGE,
                    RabbitMQConfig.DISPENSE_RESULT_ROUTING_KEY,
                    event,
                    correlation);
            CorrelationData.Confirm confirm = correlation.getFuture().get(10, TimeUnit.SECONDS);
            if (!confirm.isAck()) {
                throw new AmqpException("RabbitMQ rejected dispense result: " + confirm.getReason());
            }
            if (correlation.getReturned() != null) {
                throw new AmqpException("Dispense result was not routed to a queue");
            }
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new AmqpException("Interrupted while awaiting dispense result confirmation", exception);
        } catch (ExecutionException | TimeoutException exception) {
            throw new AmqpException("No RabbitMQ confirmation for dispense result", exception);
        }
        log.info("[ORDER RESULT PUBLISHED] orderId={}, status={}", event.orderId(), event.status());
    }
}
