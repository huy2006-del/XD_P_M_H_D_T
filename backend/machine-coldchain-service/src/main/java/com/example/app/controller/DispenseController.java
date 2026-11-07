package com.example.app.controller;

import com.example.app.config.RabbitMQConfig;
import com.example.app.dto.request.DispenseRequestMessage;
import com.example.app.dto.response.DispenseAcceptedResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Slf4j
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/dispense")
public class DispenseController {

    private final RabbitTemplate rabbitTemplate;

    @PostMapping
    public ResponseEntity<DispenseAcceptedResponse> dispense(
            @Valid @RequestBody DispenseRequestMessage request
    ) {
        DispenseRequestMessage queuedMessage = request.withRetryCount(0);
        log.info("[DISPENSE QUEUED] orderId={}, machineId={}, slotId={}, simulateJam={}",
                queuedMessage.orderId(), queuedMessage.machineId(),
                queuedMessage.slotId(), queuedMessage.simulateJam());
        rabbitTemplate.convertAndSend(
                RabbitMQConfig.DIRECT_EXCHANGE,
                RabbitMQConfig.DISPENSE_ROUTING_KEY,
                queuedMessage
        );
        return ResponseEntity.accepted().body(new DispenseAcceptedResponse(
                queuedMessage.orderId(), "QUEUED", "Lệnh nhả hàng đã được đưa vào hàng đợi."));
    }
}
