package com.example.app.service;

import com.example.app.dto.DispenseResultEvent;
import com.example.app.entity.DispenseStatus;
import com.example.app.entity.Order;
import com.example.app.entity.OrderItem;
import com.example.app.repository.OrderRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class OrderServiceDispenseResultTest {

    @Mock
    private OrderRepository orderRepository;
    @Mock
    private VietQRService vietQRService;

    private OrderService orderService;
    private Order order;

    @BeforeEach
    void setUp() {
        orderService = new OrderService(orderRepository, vietQRService);
        order = Order.builder().orderCode("ORD-1").machineId(1L).dispenseStatus(DispenseStatus.PENDING).build();
        when(orderRepository.findByOrderCodeForUpdate("ORD-1")).thenReturn(Optional.of(order));
    }

    @Test
    void dispensedResultCompletesPendingOrderAndRequestsStockDeduction() {
        boolean completedNow = orderService.applyDispenseResult(
                new DispenseResultEvent("ORD-1", 1L, 3L, "DISPENSED", null, null));

        assertTrue(completedNow);
        assertEquals(DispenseStatus.COMPLETED, order.getDispenseStatus());
        verify(orderRepository).save(order);
    }

    @Test
    void duplicateDispensedResultDoesNotRequestStockDeductionAgain() {
        order.setDispenseStatus(DispenseStatus.COMPLETED);

        boolean completedNow = orderService.applyDispenseResult(
                new DispenseResultEvent("ORD-1", 1L, 3L, "DISPENSED", null, null));

        assertFalse(completedNow);
        verify(orderRepository, never()).save(order);
    }

    @Test
    void jammedResultStoresRefundVoucherWithoutDeductingStock() {
        boolean completedNow = orderService.applyDispenseResult(
                new DispenseResultEvent("ORD-1", 1L, 3L, "JAMMED", "REFUND_VOUCHER_ORD-ABC", 100));

        assertFalse(completedNow);
        assertEquals(DispenseStatus.JAMMED, order.getDispenseStatus());
        assertEquals("REFUND_VOUCHER_ORD-ABC", order.getRefundVoucherCode());
    }

    @Test
    void multiSlotOrderCompletesAfterEachDistinctSlotIsSettled() {
        order.addItem(OrderItem.builder().slotNumber(3).quantity(2).build());
        order.addItem(OrderItem.builder().slotNumber(4).quantity(1).build());
        when(orderRepository.findByOrderCode("ORD-1")).thenReturn(Optional.of(order));
        var first = new DispenseResultEvent("ORD-1", 1L, 3L, "DISPENSED", null, null);
        var second = new DispenseResultEvent("ORD-1", 1L, 4L, "DISPENSED", null, null);

        assertTrue(orderService.applyDispenseResult(first));
        assertEquals(2, orderService.resolveDispenseQuantity("ORD-1", 3L));
        assertEquals(DispenseStatus.PENDING, order.getDispenseStatus());
        assertFalse(orderService.applyDispenseResult(first));
        assertTrue(orderService.applyDispenseResult(second));
        assertEquals(1, orderService.resolveDispenseQuantity("ORD-1", 4L));
        assertEquals(DispenseStatus.COMPLETED, order.getDispenseStatus());
    }

    @Test
    void resultFromWrongMachineLeavesOrderPending() {
        var result = new DispenseResultEvent("ORD-1", 2L, 3L, "DISPENSED", null, null);
        assertThrows(IllegalArgumentException.class, () -> orderService.applyDispenseResult(result));
        assertEquals(DispenseStatus.PENDING, order.getDispenseStatus());
        verify(orderRepository, never()).save(order);
    }
}
