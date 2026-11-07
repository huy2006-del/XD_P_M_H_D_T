package com.example.app.service;

import com.example.app.config.RabbitMQConfig;
import com.example.app.dto.request.DispenseRequestMessage;
import com.example.app.dto.response.DispenseNotification;
import com.example.app.exception.MotorJammedException;
import com.rabbitmq.client.Channel;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.AmqpException;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.support.AmqpHeaders;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

import java.io.IOException;

@Slf4j
@Component
@RequiredArgsConstructor
public class DispenseConsumer {

    private static final int MAX_ATTEMPTS = 3;
    private final RabbitTemplate rabbitTemplate;
    private final SimpMessagingTemplate messagingTemplate;
    private final DispenseWorkflowService dispenseWorkflowService;

    @RabbitListener(queues = RabbitMQConfig.DISPENSE_QUEUE,
            containerFactory = "rabbitListenerContainerFactory")
    public void consume(DispenseRequestMessage request, Channel channel,
                        @Header(AmqpHeaders.DELIVERY_TAG) long deliveryTag) throws IOException {
        if (dispenseWorkflowService.isCompleted(request.orderId())) {
            log.info("[DUPLICATE DISPENSE IGNORED] orderId={} đã được xử lý trước đó.", request.orderId());
            channel.basicAck(deliveryTag, false);
            return;
        }

        int attempt = request.retryCount() + 1;
        try {
            log.info("[MOTOR ROTATING] Đang kích hoạt động cơ Servo quay trục nhả hàng cho đơn: {}, slot: {}...",
                    request.orderId(), request.slotId());
            Thread.sleep(1500L);
            if (request.simulateJam()) {
                throw new MotorJammedException("Motor jam được kích hoạt theo simulateJam.");
            }

            DispenseNotification notification = dispenseWorkflowService.recordDispensed(request);
            messagingTemplate.convertAndSend("/topic/dispense/" + notification.machineId(), notification);
            log.info("[DISPENSED] orderId={}, slotId={}, thông báo kiosk: {}",
                    request.orderId(), notification.slotId(), notification.message());
            channel.basicAck(deliveryTag, false);
        } catch (MotorJammedException exception) {
            log.warn("[WARNING] Phát hiện kẹt cơ học hoặc cờ simulateJam=true! orderId={}, attempt={}/{}",
                    request.orderId(), attempt, MAX_ATTEMPTS);
            retryOrDeadLetter(request, channel, deliveryTag, attempt);
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            log.error("[DISPENSE INTERRUPTED] orderId={} được requeue để xử lý lại.", request.orderId(), exception);
            channel.basicNack(deliveryTag, false, true);
        }
    }

    private void retryOrDeadLetter(DispenseRequestMessage request, Channel channel,
                                   long deliveryTag, int attempt) throws IOException {
        if (attempt >= MAX_ATTEMPTS) {
            log.error("[DISPENSE FAILED] orderId={} đã hết {} lần thử; chuyển sang DLQ.",
                    request.orderId(), MAX_ATTEMPTS);
            channel.basicNack(deliveryTag, false, false);
            return;
        }

        try {
            Thread.sleep(500L * attempt);
            DispenseRequestMessage retry = request.withRetryCount(request.retryCount() + 1);
            rabbitTemplate.convertAndSend(
                    RabbitMQConfig.DIRECT_EXCHANGE,
                    RabbitMQConfig.DISPENSE_ROUTING_KEY,
                    retry
            );
            log.info("[DISPENSE RETRY QUEUED] orderId={}, nextAttempt={}/{}",
                    request.orderId(), attempt + 1, MAX_ATTEMPTS);
            channel.basicAck(deliveryTag, false);
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            channel.basicNack(deliveryTag, false, true);
        } catch (AmqpException exception) {
            log.error("[RETRY PUBLISH FAILED] orderId={} không publish được retry; requeue message gốc.",
                    request.orderId(), exception);
            channel.basicNack(deliveryTag, false, true);
        }
    }
}
