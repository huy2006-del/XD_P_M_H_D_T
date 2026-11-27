package com.example.app.listener;

import com.example.app.config.RabbitConfig;
import com.example.app.dto.DispenseResultEvent;
import com.example.app.service.InventoryService;
import com.example.app.service.OrderService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Component
@RequiredArgsConstructor
public class DispenseResultListener {

    private final OrderService orderService;
    private final InventoryService inventoryService;

    @RabbitListener(queues = RabbitConfig.DISPENSE_RESULT_QUEUE)
    @Transactional
    public void onDispenseResult(DispenseResultEvent event) {
        if (event.orderId() == null || event.orderId().isBlank()
                || event.slotId() == null || event.slotId() < 1
                || event.machineId() == null || event.machineId() < 1) {
            throw new IllegalArgumentException("Dispense result is missing the order, machine or slot.");
        }
        if (orderService.applyDispenseResult(event)) {
            int quantity = orderService.resolveDispenseQuantity(event.orderId(), event.slotId());
            inventoryService.dispenseFIFO(event.slotId(), quantity);
            log.info("[STOCK DEDUCTED] orderId={}, slotId={}, quantity={}",
                    event.orderId(), event.slotId(), quantity);
        }
    }
}
