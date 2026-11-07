package com.example.app.service;

import com.example.app.config.RabbitMQConfig;
import com.example.app.dto.request.DispenseRequestMessage;
import com.example.app.dto.response.DispenseFailureResult;
import com.rabbitmq.client.Channel;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.amqp.support.AmqpHeaders;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

import java.io.IOException;

@Slf4j
@Component
@RequiredArgsConstructor
public class DispenseDlqConsumer {

    private final DispenseWorkflowService dispenseWorkflowService;
    private final SimpMessagingTemplate messagingTemplate;
    private final DispenseResultPublisher dispenseResultPublisher;

    @RabbitListener(queues = RabbitMQConfig.DEAD_LETTER_QUEUE,
            containerFactory = "rabbitListenerContainerFactory")
    public void handleDeadLetter(DispenseRequestMessage request, Channel channel,
                                 @Header(AmqpHeaders.DELIVERY_TAG) long deliveryTag) throws IOException {
        try {
            DispenseFailureResult result = dispenseWorkflowService.recordTerminalJam(request);
            log.error("[DLQ TRIGGERED] Đơn hàng {} đã bị kẹt motor sau 3 lần thử!",
                    request.orderId());
            log.warn("[SLOT MAINTENANCE] machineId={}, slotId={} chuyển sang MAINTENANCE.",
                    result.notification().machineId(), result.notification().slotId());
            log.info("Đã hoàn trả Voucher cho khách hàng! orderId={}, voucher={}, refund={} percent.",
                    request.orderId(), result.notification().refundVoucherCode(),
                    result.notification().refundPercent());

            String destination = "/topic/dispense/" + result.notification().machineId();
            messagingTemplate.convertAndSend(destination, result.notification());
            messagingTemplate.convertAndSend("/topic/alerts", result.alert());
            messagingTemplate.convertAndSend("/topic/kiosk-admin", result.notification());
            dispenseResultPublisher.publish(result.notification());
            channel.basicAck(deliveryTag, false);
        } catch (RuntimeException exception) {
            log.error("[DLQ PROCESSING FAILED] orderId={} chưa được xử lý; requeue DLQ message.",
                    request.orderId(), exception);
            channel.basicNack(deliveryTag, false, true);
        }
    }
}
