package com.example.app.listener;

import com.example.app.config.RabbitConfig;
import com.example.app.dto.DispenseResultEvent;
import com.example.app.service.OrderService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class DispenseResultListener {

    private final OrderService orderService;

    @RabbitListener(queues = RabbitConfig.DISPENSE_RESULT_QUEUE)
    public void onDispenseResult(DispenseResultEvent event) {
        try {
            orderService.applyDispenseResult(event);
        } catch (RuntimeException exception) {
            // Không ném lại: tránh vòng requeue vô hạn trên message không xử lý được.
            log.error("[DISPENSE RESULT] Lỗi cập nhật đơn {}", event.orderId(), exception);
        }
    }
}
