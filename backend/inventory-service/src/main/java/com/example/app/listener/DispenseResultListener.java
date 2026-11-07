package com.example.app.listener;

import com.example.app.config.RabbitConfig;
import com.example.app.dto.DispenseResultEvent;
import com.example.app.service.InventoryService;
import com.example.app.service.OrderService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class DispenseResultListener {

    /** Mỗi lệnh nhả hàng ứng với 1 sản phẩm rơi xuống khay nhận. */
    private static final int ITEMS_PER_DISPENSE = 1;

    private final OrderService orderService;
    private final InventoryService inventoryService;

    @RabbitListener(queues = RabbitConfig.DISPENSE_RESULT_QUEUE)
    public void onDispenseResult(DispenseResultEvent event) {
        boolean completedNow;
        try {
            completedNow = orderService.applyDispenseResult(event);
        } catch (RuntimeException exception) {
            // Không ném lại: tránh vòng requeue vô hạn trên message không xử lý được.
            log.error("[DISPENSE RESULT] Lỗi cập nhật đơn {}", event.orderId(), exception);
            return;
        }
        if (!completedNow) {
            return;
        }

        // Trừ kho tách giao dịch riêng: lỗi kho không được làm mất trạng thái COMPLETED của đơn
        // (hàng đã thực sự rơi ra). dispenseFIFO tự đồng bộ currentStock của khay bên machine-service.
        try {
            inventoryService.dispenseFIFO(event.slotId(), ITEMS_PER_DISPENSE);
            log.info("[STOCK DEDUCTED] orderId={}, slotId={}, quantity={}",
                    event.orderId(), event.slotId(), ITEMS_PER_DISPENSE);
        } catch (RuntimeException exception) {
            log.error("[STOCK DEDUCTION FAILED] Đơn {} đã COMPLETED nhưng chưa trừ được kho khay {}; cần đối soát thủ công.",
                    event.orderId(), event.slotId(), exception);
        }
    }
}
