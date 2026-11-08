
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
import java.util.concurrent.ThreadLocalRandom;

@Slf4j
@Component
@RequiredArgsConstructor
public class DispenseConsumer {

    private static final int MAX_ATTEMPTS = 3;
    private static final long MOTOR_MIN_MILLIS = 2_000L;
    private static final long MOTOR_MAX_MILLIS = 3_000L;

    private final RabbitTemplate rabbitTemplate;
    private final SimpMessagingTemplate messagingTemplate;
    private final DispenseWorkflowService dispenseWorkflowService;
    private final DispenseResultPublisher dispenseResultPublisher;

    @RabbitListener(
            queues = RabbitMQConfig.DISPENSE_QUEUE,
            containerFactory = "rabbitListenerContainerFactory"
    )
    public void consume(
            DispenseRequestMessage request,
            Channel channel,
            @Header(AmqpHeaders.DELIVERY_TAG) long deliveryTag
    ) throws IOException {

        // 1. Kiểm tra đơn hàng đã xử lý trước đó
        if (dispenseWorkflowService.isCompleted(request.orderId())) {

            log.info(
                    "[DUPLICATE DISPENSE IGNORED] orderId={} đã được xử lý trước đó.",
                    request.orderId()
            );

            channel.basicAck(deliveryTag, false);

            log.info(
                    "[ACK SENT] Duplicate ignored | orderId={}, deliveryTag={}",
                    request.orderId(),
                    deliveryTag
            );

            return;
        }

        int attempt = request.retryCount() + 1;

        try {

            // 2. Giả lập động cơ nhả hàng
            log.info(
                    "[MOTOR ROTATING] Đang kích hoạt động cơ Servo "
                            + "quay trục nhả hàng cho đơn: {}, slot: {}...",
                    request.orderId(),
                    request.slotId()
            );

            rotateServo();

            // 3. Giả lập lỗi motor
            if (request.simulateJam()) {
                throw new MotorJammedException(
                        "Motor jam được kích hoạt theo simulateJam."
                );
            }

            dispenseWorkflowService.assertMotorOperational(request);

            // 4. Cảm biến xác nhận trái cây đã được nhả
            log.info(
                    "[SENSOR] Cảm biến hồng ngoại phát hiện trái cây "
                            + "đã rơi vào khay nhận hàng. orderId={}, slot={}",
                    request.orderId(),
                    request.slotId()
            );

            // 5. Cập nhật trạng thái nhả hàng
            DispenseNotification notification =
                    dispenseWorkflowService.recordDispensed(request);

            // 6. Gửi WebSocket về Kiosk
            messagingTemplate.convertAndSend(
                    "/topic/dispense/" + notification.machineId(),
                    notification
            );

            // 7. Phát kết quả nhả hàng
            dispenseResultPublisher.publish(notification);

            log.info(
                    "[DISPENSED] orderId={}, slotId={}, thông báo kiosk: {}",
                    request.orderId(),
                    notification.slotId(),
                    notification.message()
            );

            // 8. Manual ACK
            // Chỉ ACK sau khi xử lý thành công
            channel.basicAck(deliveryTag, false);

            log.info(
                    "[ACK SENT] SUCCESS | orderId={}, deliveryTag={}, "
                            + "message đã được xác nhận với RabbitMQ",
                    request.orderId(),
                    deliveryTag
            );

        } catch (MotorJammedException exception) {

            log.warn(
                    "[WARNING] Phát hiện kẹt cơ học hoặc simulateJam=true! "
                            + "orderId={}, attempt={}/{}",
                    request.orderId(),
                    attempt,
                    MAX_ATTEMPTS
            );

            retryOrDeadLetter(
                    request,
                    channel,
                    deliveryTag,
                    attempt
            );

        } catch (InterruptedException exception) {

            Thread.currentThread().interrupt();

            log.error(
                    "[DISPENSE INTERRUPTED] orderId={} được requeue để xử lý lại.",
                    request.orderId(),
                    exception
            );

            channel.basicNack(deliveryTag, false, true);

            log.warn(
                    "[NACK SENT] REQUEUE | orderId={}, deliveryTag={}",
                    request.orderId(),
                    deliveryTag
            );
        }
    }

    /**
     * Giả lập động cơ Servo quay trong khoảng 2–3 giây.
     */
    protected void rotateServo() throws InterruptedException {

        Thread.sleep(
                ThreadLocalRandom.current().nextLong(
                        MOTOR_MIN_MILLIS,
                        MOTOR_MAX_MILLIS + 1
                )
        );
    }

    /**
     * Retry tối đa 3 lần.
     * Nếu thất bại toàn bộ, chuyển message sang DLQ.
     */
    private void retryOrDeadLetter(
            DispenseRequestMessage request,
            Channel channel,
            long deliveryTag,
            int attempt
    ) throws IOException {

        // 9. Quá số lần Retry -> Dead Letter Queue
        if (attempt >= MAX_ATTEMPTS) {

            log.error(
                    "[DISPENSE FAILED] orderId={} đã hết {} lần thử; chuyển sang DLQ.",
                    request.orderId(),
                    MAX_ATTEMPTS
            );

            channel.basicNack(deliveryTag, false, false);

            log.warn(
                    "[NACK SENT] DEAD LETTER | orderId={}, deliveryTag={}, "
                            + "requeue=false",
                    request.orderId(),
                    deliveryTag
            );

            return;
        }

        try {

            // 10. Chờ trước khi Retry
            Thread.sleep(500L * attempt);

            DispenseRequestMessage retry =
                    request.withRetryCount(
                            request.retryCount() + 1
                    );

            // 11. Gửi message Retry vào RabbitMQ
            rabbitTemplate.convertAndSend(
                    RabbitMQConfig.DIRECT_EXCHANGE,
                    RabbitMQConfig.DISPENSE_ROUTING_KEY,
                    retry
            );

            log.info(
                    "[DISPENSE RETRY QUEUED] orderId={}, nextAttempt={}/{}",
                    request.orderId(),
                    attempt + 1,
                    MAX_ATTEMPTS
            );

            // 12. ACK message cũ sau khi gửi Retry
            channel.basicAck(deliveryTag, false);

            log.info(
                    "[ACK SENT] RETRY | orderId={}, deliveryTag={}, "
                            + "nextAttempt={}/{}",
                    request.orderId(),
                    deliveryTag,
                    attempt + 1,
                    MAX_ATTEMPTS
            );

        } catch (InterruptedException exception) {

            Thread.currentThread().interrupt();

            channel.basicNack(deliveryTag, false, true);

            log.warn(
                    "[NACK SENT] RETRY INTERRUPTED | "
                            + "orderId={}, deliveryTag={}, requeue=true",
                    request.orderId(),
                    deliveryTag
            );

        } catch (AmqpException exception) {

            log.error(
                    "[RETRY PUBLISH FAILED] orderId={} không publish được Retry; "
                            + "requeue message gốc.",
                    request.orderId(),
                    exception
            );

            channel.basicNack(deliveryTag, false, true);

            log.warn(
                    "[NACK SENT] RETRY PUBLISH FAILED | "
                            + "orderId={}, deliveryTag={}, requeue=true",
                    request.orderId(),
                    deliveryTag
            );
        }
    }
}
