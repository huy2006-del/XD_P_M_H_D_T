package com.example.app.service;

import com.example.app.dto.DispenseResultEvent;
import com.example.app.entity.DispenseStatus;
import com.example.app.entity.Order;
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
        order = Order.builder().orderCode("ORD-1").dispenseStatus(DispenseStatus.PENDING).build();
        when(orderRepository.findByOrderCode("ORD-1")).thenReturn(Optional.of(order));
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
}
