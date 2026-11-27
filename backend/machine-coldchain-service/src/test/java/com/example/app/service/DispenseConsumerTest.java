package com.example.app.service;

import com.example.app.config.RabbitMQConfig;
import com.example.app.dto.request.DispenseRequestMessage;
import com.example.app.dto.response.DispenseNotification;
import com.rabbitmq.client.Channel;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.amqp.AmqpException;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.util.Optional;

import com.example.app.exception.MotorJammedException;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DispenseConsumerTest {

    @Mock
    private RabbitTemplate rabbitTemplate;
    @Mock
    private SimpMessagingTemplate messagingTemplate;
    @Mock
    private DispenseWorkflowService dispenseWorkflowService;
    @Mock
    private DispenseResultPublisher dispenseResultPublisher;
    @Mock
    private Channel channel;

    private DispenseConsumer dispenseConsumer;

    @BeforeEach
    void setUp() {
        dispenseConsumer = new DispenseConsumer(
                rabbitTemplate, messagingTemplate, dispenseWorkflowService, dispenseResultPublisher) {
            @Override
            protected void rotateServo() {
                // bỏ qua thời gian quay 2-3 giây trong unit test
            }
        };
    }

    @Test
    void retriesJamAndAcknowledgesOriginalAfterRetryIsPublished() throws Exception {
        DispenseRequestMessage request = new DispenseRequestMessage("ORD-1", "12", "A1", true);
        when(dispenseWorkflowService.completedNotification(request)).thenReturn(Optional.empty());

        assertDoesNotThrow(() -> dispenseConsumer.consume(request, channel, 71L));

        verify(rabbitTemplate).convertAndSend(
                eq(RabbitMQConfig.DIRECT_EXCHANGE),
                eq(RabbitMQConfig.DISPENSE_ROUTING_KEY),
                eq(request.withRetryCount(1)));
        verify(channel).basicAck(71L, false);
        verifyNoInteractions(messagingTemplate);
    }

    @Test
    void deadLettersAfterThirdFailedAttempt() throws Exception {
        DispenseRequestMessage request = new DispenseRequestMessage("ORD-2", "12", "A1", true, 2);
        when(dispenseWorkflowService.completedNotification(request)).thenReturn(Optional.empty());

        assertDoesNotThrow(() -> dispenseConsumer.consume(request, channel, 72L));

        verify(channel).basicNack(72L, false, false);
        verifyNoInteractions(rabbitTemplate, messagingTemplate);
    }

    @Test
    void successfulDispensePersistsOutcomeNotifiesKioskAndAcknowledges() throws Exception {
        DispenseRequestMessage request = new DispenseRequestMessage("ORD-3", "12", "A1", false);
        DispenseNotification notification = new DispenseNotification(
                "ORD-3", 12L, 3L, "DISPENSED", "Nhả hàng thành công, mời nhận trái cây.", null, null);
        when(dispenseWorkflowService.completedNotification(request)).thenReturn(Optional.empty());
        when(dispenseWorkflowService.recordDispensed(request)).thenReturn(notification);

        assertDoesNotThrow(() -> dispenseConsumer.consume(request, channel, 73L));

        verify(messagingTemplate).convertAndSend("/topic/dispense/12", notification);
        verify(dispenseResultPublisher).publish(notification);
        verify(channel).basicAck(73L, false);
    }

    @Test
    void faultyMachineOrSlotIsTreatedAsMotorJamAndRetried() throws Exception {
        DispenseRequestMessage request = new DispenseRequestMessage("ORD-5", "12", "A1", false);
        when(dispenseWorkflowService.completedNotification(request)).thenReturn(Optional.empty());
        doThrow(new MotorJammedException("Máy đang OUT_OF_ORDER"))
                .when(dispenseWorkflowService).assertMotorOperational(request);

        assertDoesNotThrow(() -> dispenseConsumer.consume(request, channel, 75L));

        verify(rabbitTemplate).convertAndSend(
                eq(RabbitMQConfig.DIRECT_EXCHANGE),
                eq(RabbitMQConfig.DISPENSE_ROUTING_KEY),
                eq(request.withRetryCount(1)));
        verify(channel).basicAck(75L, false);
        verifyNoInteractions(messagingTemplate, dispenseResultPublisher);
    }

    @Test
    void duplicateOrderIsAcknowledgedWithoutActuatingAgain() throws Exception {
        DispenseRequestMessage request = new DispenseRequestMessage("ORD-4", "12", "A1", false);
        DispenseNotification previous = new DispenseNotification(
                "ORD-4", 12L, 3L, "DISPENSED", "Nhả hàng thành công, mời nhận trái cây.", null, null);
        when(dispenseWorkflowService.completedNotification(request)).thenReturn(Optional.of(previous));

        assertDoesNotThrow(() -> dispenseConsumer.consume(request, channel, 74L));

        verify(dispenseResultPublisher).publish(previous);
        verify(channel).basicAck(74L, false);
        verifyNoInteractions(rabbitTemplate);
    }

    @Test
    void resultPublishFailureRequeuesCommandForRecovery() throws Exception {
        DispenseRequestMessage request = new DispenseRequestMessage("ORD-6", "12", "A1", false);
        DispenseNotification notification = new DispenseNotification(
                "ORD-6", 12L, 3L, "DISPENSED", "Nhả hàng thành công, mời nhận trái cây.", null, null);
        when(dispenseWorkflowService.completedNotification(request)).thenReturn(Optional.empty());
        when(dispenseWorkflowService.recordDispensed(request)).thenReturn(notification);
        doThrow(new AmqpException("broker unavailable"))
                .when(dispenseResultPublisher).publish(notification);

        assertDoesNotThrow(() -> dispenseConsumer.consume(request, channel, 76L));

        verify(dispenseResultPublisher).publish(notification);
        verify(channel).basicNack(76L, false, true);
    }
}
