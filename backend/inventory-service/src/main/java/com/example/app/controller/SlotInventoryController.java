package com.example.app.controller;

import com.example.app.dto.DispenseRequest;
import com.example.app.dto.DispenseResultDTO;
import com.example.app.dto.LoadSlotRequest;
import com.example.app.dto.SlotInventoryItem;
import com.example.app.service.InventoryService;
import com.example.app.service.InventoryService.MachineSyncStatus;
import com.example.app.service.InventoryService.RestockItem;
import com.example.app.service.InventoryService.RestockSession;
import com.example.app.service.InventoryService.RestockStatus;
import com.fasterxml.jackson.annotation.JsonInclude;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.JwtParser;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import org.springframework.core.env.Environment;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.servlet.HandlerInterceptor;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/slots/{slotId}")
public class SlotInventoryController {
    private final InventoryService service;

    public SlotInventoryController(InventoryService service) { this.service = service; }

    @GetMapping("/inventory")
    public List<SlotInventoryItem> inventory(@PathVariable Long slotId) { return service.getSlotInventory(slotId); }

    @PostMapping("/batches")
    @ResponseStatus(HttpStatus.CREATED)
    public SlotInventoryItem load(@PathVariable Long slotId, @Valid @RequestBody LoadSlotRequest request) {
        return service.loadToSlot(slotId, request.batchId(), request.quantity());
    }

    @PostMapping("/dispense")
    public DispenseResultDTO dispense(@PathVariable Long slotId, @Valid @RequestBody DispenseRequest request) {
        return service.dispenseFIFO(slotId, request.quantity());
    }
}

@RestController
@RequestMapping("/api/v1/restock-sessions")
class RestockSessionController {
    private final InventoryService service;

    RestockSessionController(InventoryService service) {
        this.service = service;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    SessionResponse create(@RequestAttribute(RestockJwtAuthentication.ACTOR_ATTRIBUTE) RestockActor actor,
                           @Valid @RequestBody CreateSessionRequest request) {
        return SessionResponse.from(service.createRestockSession(request.machineId(), actor.userId(), request.notes()),
                null);
    }

    @PostMapping("/{id}/items")
    RestockItem addItem(@RequestAttribute(RestockJwtAuthentication.ACTOR_ATTRIBUTE) RestockActor actor,
                        @PathVariable @Positive long id, @Valid @RequestBody AddItemRequest request) {
        return service.addRestockItem(id, actor.userId(), request.slotId(), request.batchId(), request.quantityAdded());
    }

    @PostMapping("/{id}/complete")
    SessionResponse complete(@RequestAttribute(RestockJwtAuthentication.ACTOR_ATTRIBUTE) RestockActor actor,
                              @PathVariable @Positive long id,
                              @RequestBody(required = false) CompleteSessionRequest request) {
        var completed = service.completeRestockSession(id, actor.userId(), request == null ? null : request.notes());
        return SessionResponse.from(completed.session(), completed.machineSyncStatus());
    }

    @GetMapping("/machine/{machineId}")
    List<SessionResponse> history(@RequestAttribute(RestockJwtAuthentication.ACTOR_ATTRIBUTE) RestockActor actor,
                                  @PathVariable @Positive long machineId) {
        List<RestockSession> sessions = actor.isAdmin() ? service.getRestockHistory(machineId)
                : service.getRestockHistoryForOperator(machineId, actor.userId());
        return sessions.stream().map(session -> SessionResponse.from(session, null)).toList();
