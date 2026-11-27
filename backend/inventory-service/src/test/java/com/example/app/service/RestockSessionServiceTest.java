package com.example.app.service;

import com.example.app.client.AuditLogClient;
import com.example.app.client.MachineSlotClient;
import com.example.app.dto.MachineSlotInventoryResponse;
import com.example.app.dto.RestockSessionDto;
import com.example.app.dto.SlotInventoryItem;
import com.example.app.entity.RestockItem;
import com.example.app.entity.RestockSession;
import com.example.app.entity.RestockSessionStatus;
import com.example.app.entity.FruitBatch;
import com.example.app.entity.Product;
import com.example.app.exception.BusinessRuleException;
import com.example.app.repository.FruitBatchRepository;
import com.example.app.repository.RestockSessionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.AfterEach;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.mock;

@ExtendWith(MockitoExtension.class)
class RestockSessionServiceTest {

    @Mock
    private RestockSessionRepository sessionRepository;
    @Mock
    private InventoryService inventoryService;
    @Mock
    private AuditLogClient auditLogClient;

    @Mock
    private MachineSlotClient machineSlots;
    @Mock
    private FruitBatchRepository batchRepository;
    private final UUID operatorId = UUID.randomUUID();
    private RestockSessionService service;

    @BeforeEach
    void setUp() {
        service = new RestockSessionService(sessionRepository, inventoryService, auditLogClient, machineSlots, batchRepository);
        Jwt jwt = Jwt.withTokenValue("test").header("alg", "HS256")
                .subject("operator").claim("userId", operatorId.toString()).build();
        SecurityContextHolder.getContext().setAuthentication(
                new JwtAuthenticationToken(jwt, List.of(new SimpleGrantedAuthority("ROLE_OPERATOR"))));
    }

    @AfterEach
    void clearAuthentication() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void createSessionGeneratesCodeAndInProgressStatus() {
        when(sessionRepository.save(any(RestockSession.class))).thenAnswer(inv -> inv.getArgument(0));

        RestockSessionDto.SessionResponse response = service.createSession(
                new RestockSessionDto.CreateSessionRequest(1L, UUID.randomUUID(), "Nạp ca sáng"));

        assertEquals(RestockSessionStatus.IN_PROGRESS, response.status());
        assertEquals(1L, response.machineId());
        assertEquals(operatorId, response.operatorId());
        assertEquals(true, response.sessionCode().startsWith("RS-"));
    }

    @Test
    void addItemLoadsSlotAndAppendsItemToSession() {
        RestockSession session = RestockSession.builder()
                .id(10L)
                .sessionCode("RS-20261126-001")
                .machineId(1L)
                .operatorId(operatorId)
                .status(RestockSessionStatus.IN_PROGRESS)
                .build();
        when(sessionRepository.findByIdForUpdate(10L)).thenReturn(Optional.of(session));
        when(machineSlots.getMachineSlots(1L)).thenReturn(List.of(
                new MachineSlotInventoryResponse(3L, 2L, 10, 0, "EMPTY", "A2", "Cam vàng")));
        FruitBatch batch = mock(FruitBatch.class);
        Product product = mock(Product.class);
        when(batchRepository.findById(5L)).thenReturn(Optional.of(batch));
        when(batch.getBatchCode()).thenReturn("LOT-1");
        when(batch.getProduct()).thenReturn(product);
        when(product.getName()).thenReturn("Cam vàng");
        when(inventoryService.loadToSlot(3L, 5L, 4)).thenReturn(
                new SlotInventoryItem(5L, "LOT-1", LocalDate.now().plusDays(3), 4));
        when(sessionRepository.saveAndFlush(any(RestockSession.class))).thenAnswer(inv -> inv.getArgument(0));

        RestockSessionDto.SessionResponse response = service.addItem(10L,
                new RestockSessionDto.AddItemRequest(3L, 5L, 4));

        assertEquals(1, response.items().size());
        assertEquals(4, response.items().get(0).quantityAdded());
        verify(inventoryService).loadToSlot(3L, 5L, 4);
    }

    @Test
    void completeSessionRejectsEmptyItemsAndCompletesValidSession() {
        RestockSession emptySession = RestockSession.builder()
                .id(11L)
                .sessionCode("RS-20261126-002")
                .machineId(1L)
                .operatorId(operatorId)
                .status(RestockSessionStatus.IN_PROGRESS)
                .build();
        when(sessionRepository.findByIdForUpdate(11L)).thenReturn(Optional.of(emptySession));
        assertThrows(BusinessRuleException.class, () -> service.completeSession(11L));

        emptySession.addItem(RestockItem.builder().slotId(3L).batchId(5L).quantityAdded(4).build());
        when(sessionRepository.save(any(RestockSession.class))).thenAnswer(inv -> inv.getArgument(0));

        RestockSessionDto.SessionResponse completed = service.completeSession(11L);
        assertEquals(RestockSessionStatus.COMPLETED, completed.status());
        assertNotNull(completed.completedAt());
        verify(auditLogClient).recordAuditLog(any());
    }
}
