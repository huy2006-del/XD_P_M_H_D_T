package com.example.app.service;

import com.example.app.client.AuditLogClient;
import com.example.app.client.MachineSlotClient;
import feign.FeignException;
import com.example.app.dto.AuditLogEvent;
import com.example.app.dto.RestockSessionDto;
import com.example.app.entity.RestockItem;
import com.example.app.entity.RestockSession;
import com.example.app.entity.RestockSessionStatus;
import com.example.app.exception.BusinessRuleException;
import com.example.app.exception.ResourceNotFoundException;
import com.example.app.repository.RestockSessionRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import com.example.app.entity.FruitBatch;
import com.example.app.repository.FruitBatchRepository;

@Slf4j
@Service
@RequiredArgsConstructor
public class RestockSessionService {

    private final RestockSessionRepository sessionRepository;
    private final InventoryService inventoryService;
    private final AuditLogClient auditLogClient;
    private final MachineSlotClient machineSlots;
    private final FruitBatchRepository batchRepository;

    @Transactional
    public RestockSessionDto.SessionResponse createSession(
            RestockSessionDto.CreateSessionRequest request) {

        UUID operatorId = getCurrentOperatorId();
        UUID requestId = request.requestId();

        if (requestId != null) {
            sessionRepository.lockCreateRequest(
                    operatorId + ":" + requestId
            );

            var prior = sessionRepository
                    .findByOperatorIdAndRequestId(
                            operatorId, requestId
                    );

            if (prior.isPresent()) {
                RestockSession existing = prior.get();

                if (!existing.getMachineId().equals(request.machineId())
                        || !Objects.equals(
                                existing.getNotes(),
                                request.notes())) {

                    throw new BusinessRuleException(
                            "Mã yêu cầu đã được dùng cho phiên tiếp hàng khác."
                    );
                }

                return RestockSessionDto.SessionResponse.from(existing);
            }
        }

        try {
            machineSlots.requireMachine(request.machineId());

        } catch (FeignException.NotFound exception) {

            throw new ResourceNotFoundException(
                    "Machine", request.machineId()
            );
        }

        String sessionCode = generateSessionCode();

        RestockSession session = RestockSession.builder()
                .sessionCode(sessionCode)
                .machineId(request.machineId())
                .operatorId(operatorId)
                .requestId(requestId)
                .status(RestockSessionStatus.IN_PROGRESS)
                .notes(request.notes())
                .build();

        return RestockSessionDto.SessionResponse.from(
                sessionRepository.save(session)
        );
    }

    @Transactional
    public RestockSessionDto.SessionResponse addItem(
            Long sessionId,
            RestockSessionDto.AddItemRequest request) {

        RestockSession session = sessionRepository
                .findByIdForUpdate(sessionId)
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "RestockSession", sessionId
                        )
                );

        validateSessionOwner(session);

        if (request.requestId() != null) {

            for (RestockItem item : session.getItems()) {

                if (!request.requestId().equals(item.getRequestId())) {
                    continue;
                }

                if (!item.getSlotId().equals(request.slotId())
                        || !item.getBatchId().equals(request.batchId())
                        || item.getQuantityAdded() != request.quantityAdded()) {

                    throw new BusinessRuleException(
                            "Mã yêu cầu đã được dùng cho mục nạp hàng khác."
                    );
                }

                return RestockSessionDto.SessionResponse.from(session);
            }
        }

        if (session.getStatus() != RestockSessionStatus.IN_PROGRESS) {

            throw new BusinessRuleException(
                    "Phiên tiếp hàng đã kết thúc hoặc bị hủy, không thể thêm khay."
            );
        }

        var machineSlot = machineSlots.getMachineSlots(session.getMachineId())
                .stream()
                .filter(slot -> request.slotId().equals(slot.slotId()))
                .findFirst()
                .orElseThrow(() -> new BusinessRuleException(
                        "Khay không thuộc máy của phiên tiếp hàng."));

        FruitBatch batch = batchRepository.findById(request.batchId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Batch", request.batchId()));

        if (machineSlot.slotCode() == null || machineSlot.slotCode().isBlank()) {
            throw new BusinessRuleException("Không lấy được mã khay từ Machine Service.");
        }

        boolean duplicateItem = session.getItems().stream()
                .anyMatch(item -> item.getSlotId().equals(request.slotId())
                        && item.getBatchId().equals(request.batchId()));
        if (duplicateItem) {
            throw new BusinessRuleException("Lô hàng này đã được thêm vào khay trong phiên.");
        }

        RestockItem item = RestockItem.builder()
                .slotId(request.slotId())
                .slotCode(machineSlot.slotCode())
                .batchId(request.batchId())
                .batchCode(batch.getBatchCode())
                .productName(batch.getProduct().getName())
                .quantityAdded(request.quantityAdded())
                .requestId(request.requestId())
                .build();

        session.addItem(item);
        sessionRepository.saveAndFlush(session);

        inventoryService.loadToSlot(
                request.slotId(), request.batchId(), request.quantityAdded());

        return RestockSessionDto.SessionResponse.from(session);
    }

    @Transactional
    public RestockSessionDto.SessionResponse completeSession(
            Long sessionId) {

        RestockSession session = sessionRepository
                .findByIdForUpdate(sessionId)
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "RestockSession", sessionId
                        )
                );

        validateSessionOwner(session);

        if (session.getStatus() == RestockSessionStatus.COMPLETED) {

            return RestockSessionDto.SessionResponse.from(session);
        }

        if (session.getStatus() != RestockSessionStatus.IN_PROGRESS) {

            throw new BusinessRuleException(
                    "Phiên tiếp hàng không ở trạng thái IN_PROGRESS."
            );
        }

        if (session.getItems() == null
                || session.getItems().isEmpty()) {

            throw new BusinessRuleException(
                    "Phiên tiếp hàng phải có ít nhất một mục trước khi hoàn tất."
            );
        }

        session.setStatus(RestockSessionStatus.COMPLETED);

        session.setCompletedAt(
                LocalDateTime.now()
                        .truncatedTo(ChronoUnit.MICROS)
        );

        RestockSession saved = sessionRepository.save(session);

        recordSessionCompletedAudit(saved);

        return RestockSessionDto.SessionResponse.from(saved);
    }

    @Transactional(readOnly = true)
    public List<RestockSessionDto.SessionResponse> getSessions() {

        return readHistory(null);
    }

    @Transactional(readOnly = true)
    public List<RestockSessionDto.SessionResponse> getSessionsByMachine(
            Long machineId) {

        return readHistory(machineId);
    }

    private List<RestockSessionDto.SessionResponse> readHistory(
            Long machineId) {

        UUID operatorId = getCurrentOperatorId();

        Map<Long, RestockSessionDto.SessionResponse> sessions =
                new LinkedHashMap<>();

        for (var row : sessionRepository.findHistory(
                machineId,
                isAdmin() ? null : operatorId)) {

            var session = sessions.computeIfAbsent(
                    row.getId(),
                    id -> new RestockSessionDto.SessionResponse(
                            id,
                            row.getSessionCode(),
                            row.getMachineId(),
                            row.getOperatorId(),
                            RestockSessionStatus.valueOf(row.getStatus()),
                            row.getStartedAt(),
                            row.getCompletedAt(),
                            row.getNotes(),
                            new ArrayList<>()
                    )
            );

            if (row.getItemId() != null) {

                session.items().add(
                        new RestockSessionDto.ItemResponse(
                                row.getItemId(),
                                row.getSlotId(),
                                row.getSlotCode(),
                                row.getBatchId(),
                                row.getBatchCode(),
                                row.getProductName(),
                                row.getQuantityAdded()
                        )
                );
            }
        }

        return List.copyOf(sessions.values());
    }

    private UUID getCurrentOperatorId() {

        Authentication authentication =
                SecurityContextHolder.getContext()
                        .getAuthentication();

        if (!(authentication instanceof JwtAuthenticationToken jwt)
                || !authentication.isAuthenticated()) {

            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Người dùng chưa được xác thực."
            );
        }

        String userId = jwt.getToken()
                .getClaimAsString("userId");

        if (userId == null || userId.isBlank()) {

            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "JWT không chứa userId."
            );
        }

        try {

            return UUID.fromString(userId);

        } catch (IllegalArgumentException exception) {

            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "userId trong JWT không hợp lệ."
            );
        }
    }

    private boolean isAdmin() {

        Authentication authentication =
                SecurityContextHolder.getContext()
                        .getAuthentication();

        return authentication != null
                && authentication.isAuthenticated()
                && authentication.getAuthorities()
                    .stream()
                    .anyMatch(authority ->
                            "ROLE_ADMIN".equals(
                                    authority.getAuthority()
                            )
                    );
    }

    private void validateSessionOwner(RestockSession session) {

        UUID currentOperatorId = getCurrentOperatorId();

        if (!currentOperatorId.equals(session.getOperatorId())) {

            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Bạn không có quyền thao tác trên phiên tiếp hàng này."
            );
        }
    }

    // Sinh mã phiên đúng định dạng RS-YYYYMMDD-XXX.
    // Khóa theo ngày để tránh trùng mã khi tạo đồng thời.
    private String generateSessionCode() {

        String date = LocalDate.now()
                .format(DateTimeFormatter.BASIC_ISO_DATE);

        String prefix = "RS-" + date + "-";

        sessionRepository.lockCreateRequest(
                "SESSION_CODE:" + date
        );

        int nextSequence =
                sessionRepository.findMaxSessionSequence(prefix) + 1;

        if (nextSequence > 999) {

            throw new BusinessRuleException(
                    "Đã đạt giới hạn số phiên tiếp hàng trong ngày."
            );
        }

        return prefix + String.format(
                java.util.Locale.ROOT,
                "%03d",
                nextSequence
        );
    }

    private void recordSessionCompletedAudit(
            RestockSession session) {

        try {

            Authentication authentication =
                    SecurityContextHolder.getContext()
                            .getAuthentication();

            String username = authentication.getName();

            int totalQty = session.getItems()
                    .stream()
                    .mapToInt(RestockItem::getQuantityAdded)
                    .sum();

            AuditLogEvent event = new AuditLogEvent(
                    "RESTOCK_COMPLETED",
                    null,
                    username,
                    "Hoàn tất phiên nạp hàng "
                            + session.getSessionCode()
                            + " cho máy #"
                            + session.getMachineId()
                            + " ("
                            + session.getItems().size()
                            + " mục, +"
                            + totalQty
                            + " sản phẩm)"
                            + " | Operator UUID: "
                            + session.getOperatorId()
            );

            auditLogClient.recordAuditLog(event);

        } catch (RuntimeException exception) {

            log.warn(
                    "Không ghi được audit hoàn tất phiên tiếp hàng {}; nghiệp vụ chính vẫn tiếp tục.",
                    session.getSessionCode(),
                    exception
            );
        }
    }
}
