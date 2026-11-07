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
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.mockito.ArgumentMatchers.eq;
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
    private Channel channel;

    private DispenseConsumer dispenseConsumer;

    @BeforeEach
    void setUp() {
        dispenseConsumer = new DispenseConsumer(
                rabbitTemplate, messagingTemplate, dispenseWorkflowService);
    }

    @Test
    void retriesJamAndAcknowledgesOriginalAfterRetryIsPublished() throws Exception {
        DispenseRequestMessage request = new DispenseRequestMessage("ORD-1", "12", "A1", true);
        when(dispenseWorkflowService.isCompleted("ORD-1")).thenReturn(false);

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
        when(dispenseWorkflowService.isCompleted("ORD-2")).thenReturn(false);

        assertDoesNotThrow(() -> dispenseConsumer.consume(request, channel, 72L));

        verify(channel).basicNack(72L, false, false);
        verifyNoInteractions(rabbitTemplate, messagingTemplate);
    }

    @Test
    void successfulDispensePersistsOutcomeNotifiesKioskAndAcknowledges() throws Exception {
        DispenseRequestMessage request = new DispenseRequestMessage("ORD-3", "12", "A1", false);
        DispenseNotification notification = new DispenseNotification(
                "ORD-3", 12L, 3L, "DISPENSED", "Nhả hàng thành công, mời nhận trái cây.", null, null);
        when(dispenseWorkflowService.isCompleted("ORD-3")).thenReturn(false);
        when(dispenseWorkflowService.recordDispensed(request)).thenReturn(notification);

        assertDoesNotThrow(() -> dispenseConsumer.consume(request, channel, 73L));

        verify(messagingTemplate).convertAndSend("/topic/dispense/12", notification);
        verify(channel).basicAck(73L, false);
    }

    @Test
    void duplicateOrderIsAcknowledgedWithoutActuatingAgain() throws Exception {
        DispenseRequestMessage request = new DispenseRequestMessage("ORD-4", "12", "A1", false);
        when(dispenseWorkflowService.isCompleted("ORD-4")).thenReturn(true);

        assertDoesNotThrow(() -> dispenseConsumer.consume(request, channel, 74L));

        verify(channel).basicAck(74L, false);
        verifyNoInteractions(rabbitTemplate, messagingTemplate);
    }
}
