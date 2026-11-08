package com.example.app.listener;

import com.example.app.dto.DispenseResultEvent;
import com.example.app.service.InventoryService;
import com.example.app.service.OrderService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DispenseResultListenerTest {

    @Mock
    private OrderService orderService;
    @Mock
    private InventoryService inventoryService;
    @InjectMocks
    private DispenseResultListener listener;

    private final DispenseResultEvent event =
            new DispenseResultEvent("ORD-1", 1L, 3L, "DISPENSED", null, null);

    @Test
    void completedOrderDeductsOneItemFromSlot() {
        when(orderService.applyDispenseResult(event)).thenReturn(true);

        listener.onDispenseResult(event);

        verify(inventoryService).dispenseFIFO(3L, 1);
    }

    @Test
    void duplicateOrJammedResultDoesNotTouchStock() {
        when(orderService.applyDispenseResult(event)).thenReturn(false);

        listener.onDispenseResult(event);

        verifyNoInteractions(inventoryService);
    }

    @Test
    void stockFailureDoesNotPropagateSoMessageIsNotRequeued() {
        when(orderService.applyDispenseResult(event)).thenReturn(true);
        doThrow(new IllegalStateException("không đủ hàng")).when(inventoryService).dispenseFIFO(3L, 1);

        assertDoesNotThrow(() -> listener.onDispenseResult(event));
    }
}
