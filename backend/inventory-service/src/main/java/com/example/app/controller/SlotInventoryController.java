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
    }

    @ExceptionHandler(ResponseStatusException.class)
    ResponseEntity<Map<String, Object>> handleStatus(ResponseStatusException exception) {
        var response = ResponseEntity.status(exception.getStatusCode());
        if (exception.getStatusCode().value() == HttpStatus.UNAUTHORIZED.value()) {
            response.header(HttpHeaders.WWW_AUTHENTICATE, "Bearer");
        }
        return response.body(Map.of("timestamp", Instant.now(), "status", exception.getStatusCode().value(),
                "error", exception.getBody().getTitle(), "message",
                exception.getReason() == null ? "Invalid restock request" : exception.getReason()));
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    ResponseEntity<Map<String, Object>> handleInvalidPathId() {
        return handleStatus(new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid restock path ID"));
    }

    record CreateSessionRequest(@NotNull @Positive Long machineId, String notes) {}

    record AddItemRequest(@NotNull @Positive Long slotId, @NotNull @Positive Long batchId,
                          @NotNull @Positive Integer quantityAdded) {}

    record CompleteSessionRequest(String notes) {}

    @JsonInclude(JsonInclude.Include.NON_NULL)
    record SessionResponse(long id, String sessionCode, long machineId, UUID operatorId, RestockStatus status,
                           Instant startedAt, Instant completedAt, String notes, List<RestockItem> items,
                           MachineSyncStatus machineSyncStatus) {
        static SessionResponse from(RestockSession session, MachineSyncStatus machineSyncStatus) {
            return new SessionResponse(session.id(), session.sessionCode(), session.machineId(), session.operatorId(),
                    session.status(), session.startedAt(), session.completedAt(), session.notes(), session.items(),
                    machineSyncStatus);
        }
    }
}

record RestockActor(UUID userId, boolean isAdmin) {}

@Component
class RestockJwtAuthentication implements WebMvcConfigurer, HandlerInterceptor {
    static final String ACTOR_ATTRIBUTE = "com.example.app.restock.actor";
    private final JwtParser parser;

    RestockJwtAuthentication(Environment environment) {
        String secret = environment.getProperty("jwt.secret");
        parser = createParser(secret);
    }

    private static JwtParser createParser(String secret) {
        if (secret == null || secret.isBlank()) return null;
        byte[] key = secret.getBytes(StandardCharsets.UTF_8);
        if (key.length < 64) return null;

        var signatures = Jwts.parser().verifyWith(Keys.hmacShaKeyFor(key)).sig();
        for (var algorithm : Jwts.SIG.get().values()) {
            if (!Jwts.SIG.HS512.getId().equals(algorithm.getId())) signatures.remove(algorithm);
        }
        return signatures.and().build();
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(this);
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        if (!(handler instanceof HandlerMethod method)
                || !RestockSessionController.class.isAssignableFrom(method.getBeanType())) {
            return true;
        }
        request.setAttribute(ACTOR_ATTRIBUTE, authenticate(request.getHeader(HttpHeaders.AUTHORIZATION)));
        return true;
    }

    private RestockActor authenticate(String authorization) {
        if (authorization == null || !authorization.regionMatches(true, 0, "Bearer ", 0, 7)
                || authorization.length() == 7) {
            throw unauthorized();
        }
        if (parser == null) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Restock authentication is unavailable");
        }

        Claims claims;
        UUID userId;
        try {
            claims = parser.parseSignedClaims(authorization.substring(7)).getPayload();
            String claim = claims.get("userId", String.class);
            if (claims.getExpiration() == null || claim == null) throw unauthorized();
            userId = UUID.fromString(claim);
            if (!userId.toString().equalsIgnoreCase(claim)) throw unauthorized();
        } catch (JwtException | IllegalArgumentException ignored) {
            throw unauthorized();
        }

        Object role = claims.get("role");
        boolean admin = "ADMIN".equals(role);
        if (!admin && !"OPERATOR".equals(role)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Role is not permitted to access restock");
        }
        return new RestockActor(userId, admin);
    }

    private static ResponseStatusException unauthorized() {
        return new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid or missing bearer token");
    }
}
