package com.example.app.service;

import com.example.app.config.RabbitConfig;
import com.example.app.dto.BatchRequest;
import com.example.app.dto.BatchResponse;
import com.example.app.dto.OrderPaidEvent;
import com.example.app.dto.OrderResponse;
import com.example.app.dto.PaymentWebhookRequest;
import com.example.app.dto.ProductRequest;
import com.example.app.dto.ProductResponse;
import com.example.app.entity.FruitBatch;
import com.example.app.entity.Order;
import com.example.app.entity.OrderItem;
import com.example.app.entity.PaymentStatus;
import com.example.app.entity.Product;
import com.example.app.repository.FruitBatchRepository;
import com.example.app.repository.OrderRepository;
import com.example.app.repository.ProductRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PaymentAndCatalogServiceTest {

    @Mock
    private OrderRepository orderRepository;
    @Mock
    private RabbitTemplate rabbitTemplate;
    @Mock
    private OrderService orderService;
    @Mock
    private ProductRepository productRepository;
    @Mock
    private FruitBatchRepository batchRepository;

    private PaymentService paymentService;
    private ProductService productService;
    private BatchService batchService;

    @BeforeEach
    void setUp() {
        paymentService = new PaymentService(orderRepository, rabbitTemplate, orderService);
        ReflectionTestUtils.setField(paymentService, "exchange", RabbitConfig.EXCHANGE_NAME);
        ReflectionTestUtils.setField(paymentService, "routingKey", RabbitConfig.ROUTING_KEY);

        productService = new ProductService(productRepository);
        batchService = new BatchService(batchRepository, productRepository);
    }

    @Test
    @SuppressWarnings("unchecked")
    void processWebhookSuccessUpdatesOrderEmitsPaidEventAndDispenseCommandsWithSimulateJam() {
        Order order = Order.builder()
                .id(100L)
                .orderCode("ORD-2026-001")
                .machineId(5L)
                .totalAmount(BigDecimal.valueOf(70000))
                .paymentStatus(PaymentStatus.PENDING)
                .build();
        order.addItem(OrderItem.builder().slotNumber(2).quantity(1).build());
        order.addItem(OrderItem.builder().slotNumber(4).quantity(1).build());
        order.addItem(OrderItem.builder().slotNumber(2).quantity(1).build()); // duplicate slot -> distinct

        when(orderRepository.findByOrderCodeForUpdate("ORD-2026-001")).thenReturn(Optional.of(order));
        when(orderService.getOrderByCode("ORD-2026-001"))
                .thenReturn(OrderResponse.builder()
                        .orderCode("ORD-2026-001")
                        .paymentStatus(PaymentStatus.SUCCESS)
                        .build());

        PaymentWebhookRequest webhook = new PaymentWebhookRequest();
        webhook.setOrderCode("ORD-2026-001");
        webhook.setAmount(BigDecimal.valueOf(70000));
        webhook.setResponseCode("00");
        webhook.setSimulateJam(true);

        OrderResponse response = paymentService.processWebhook(webhook);

        assertEquals(PaymentStatus.SUCCESS, order.getPaymentStatus());
        assertEquals(PaymentStatus.SUCCESS, response.getPaymentStatus());
        verify(orderRepository).save(order);

        ArgumentCaptor<OrderPaidEvent> paidCaptor = ArgumentCaptor.forClass(OrderPaidEvent.class);
        verify(rabbitTemplate).convertAndSend(
                eq(RabbitConfig.EXCHANGE_NAME),
                eq(RabbitConfig.ROUTING_KEY),
                paidCaptor.capture()
        );
        assertEquals("ORD-2026-001", paidCaptor.getValue().getOrderCode());
        assertEquals(5L, paidCaptor.getValue().getMachineId());

        ArgumentCaptor<Map<String, Object>> dispenseCaptor = ArgumentCaptor.forClass(Map.class);
        verify(rabbitTemplate, times(2)).convertAndSend(
                eq(RabbitConfig.DIRECT_EXCHANGE_NAME),
                eq(RabbitConfig.DISPENSE_ROUTING_KEY),
                dispenseCaptor.capture()
        );

        List<Map<String, Object>> commands = dispenseCaptor.getAllValues();
        assertEquals("2", commands.get(0).get("slotId"));
        assertEquals(true, commands.get(0).get("simulateJam"));
        assertEquals("4", commands.get(1).get("slotId"));
        assertEquals(true, commands.get(1).get("simulateJam"));
    }

    @Test
    void processWebhookDuplicateOnAlreadyPaidOrderIsIdempotent() {
        Order order = Order.builder()
                .id(101L)
                .orderCode("ORD-2026-002")
                .machineId(5L)
                .totalAmount(BigDecimal.valueOf(35000))
                .paymentStatus(PaymentStatus.SUCCESS)
                .build();

        when(orderRepository.findByOrderCodeForUpdate("ORD-2026-002")).thenReturn(Optional.of(order));
        when(orderService.getOrderByCode("ORD-2026-002"))
                .thenReturn(OrderResponse.builder()
                        .orderCode("ORD-2026-002")
                        .paymentStatus(PaymentStatus.SUCCESS)
                        .build());

        PaymentWebhookRequest webhook = new PaymentWebhookRequest();
        webhook.setOrderCode("ORD-2026-002");
        webhook.setAmount(BigDecimal.valueOf(35000));
        webhook.setResponseCode("00");

        OrderResponse response = paymentService.processWebhook(webhook);

        assertEquals(PaymentStatus.SUCCESS, response.getPaymentStatus());
        verify(orderRepository, never()).save(any());
        verifyNoInteractions(rabbitTemplate);
    }

    @Test
    void createProductValidatesTempRangeAndCreatesProduct() {
        ProductRequest invalidTempRequest = new ProductRequest(
                "Táo Envy", "SKU-ENVY", BigDecimal.valueOf(35000), "quả", null,
                7, BigDecimal.valueOf(10), BigDecimal.valueOf(4), "Táo nhập khẩu"
        );
        assertThrows(IllegalArgumentException.class, () -> productService.create(invalidTempRequest));

        ProductRequest validRequest = new ProductRequest(
                "Táo Envy", "SKU-ENVY", BigDecimal.valueOf(35000), "quả", null,
                7, BigDecimal.valueOf(2), BigDecimal.valueOf(8), "Táo nhập khẩu"
        );
        when(productRepository.existsBySkuIgnoreCase("SKU-ENVY")).thenReturn(false);
        when(productRepository.save(any(Product.class))).thenAnswer(inv -> {
            Product saved = inv.getArgument(0);
            ReflectionTestUtils.setField(saved, "id", 10L);
            return saved;
        });

        ProductResponse created = productService.create(validRequest);

        assertEquals("10", created.id());
        assertEquals("Táo Envy", created.name());
        assertEquals("SKU-ENVY", created.sku());
        assertTrue(created.isActive());
    }

    @Test
    @SuppressWarnings("unchecked")
    void createBatchAndFilterBatchesByExpiredFlag() {
        Product product = new Product("Dâu Tây", "SKU-STRAW", BigDecimal.valueOf(45000), "hộp", null,
                5, BigDecimal.valueOf(2), BigDecimal.valueOf(6), null);
        ReflectionTestUtils.setField(product, "id", 20L);

        when(productRepository.findById(20L)).thenReturn(Optional.of(product));
        when(batchRepository.existsByBatchCodeIgnoreCase("LOT-STRAW-01")).thenReturn(false);
        when(batchRepository.save(any(FruitBatch.class))).thenAnswer(inv -> {
            FruitBatch b = inv.getArgument(0);
            ReflectionTestUtils.setField(b, "id", 55L);
            return b;
        });

        BatchRequest batchReq = new BatchRequest(
                20L, "LOT-STRAW-01", "Đà Lạt Farm",
                LocalDate.now().minusDays(1), LocalDate.now().plusDays(4),
                30, BigDecimal.valueOf(25000)
        );

        BatchResponse createdBatch = batchService.create(batchReq);
        assertNotNull(createdBatch);
        assertEquals(55L, createdBatch.id());
        assertEquals("LOT-STRAW-01", createdBatch.batchCode());
        assertFalse(createdBatch.expired());

        FruitBatch expiredEntity = new FruitBatch(
                product, "LOT-EXP-99", "Đà Lạt Farm",
                LocalDate.now().minusDays(10), LocalDate.now().minusDays(2),
                15, BigDecimal.valueOf(25000)
        );
        ReflectionTestUtils.setField(expiredEntity, "id", 99L);

        when(batchRepository.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(expiredEntity)));

        Page<BatchResponse> expiredPage = batchService.list(20L, true, null, 0, 10);
        assertEquals(1, expiredPage.getTotalElements());
        assertTrue(expiredPage.getContent().get(0).expired());
        assertEquals("LOT-EXP-99", expiredPage.getContent().get(0).batchCode());
    }
}
