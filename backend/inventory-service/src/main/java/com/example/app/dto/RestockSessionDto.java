package com.example.app.dto;

import com.example.app.entity.RestockItem;
import com.example.app.entity.RestockSession;
import com.example.app.entity.RestockSessionStatus;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public final class RestockSessionDto {

    private RestockSessionDto() {}

    public record CreateSessionRequest(
            @NotNull @Min(1) Long machineId,
            UUID operatorId,
            @Size(max = 1000) String notes,
            UUID requestId
    ) {
        public CreateSessionRequest(Long machineId, UUID operatorId, String notes) {
            this(machineId, operatorId, notes, null);
        }
    }

    public record AddItemRequest(
            @NotNull @Min(1) Long slotId,
            @NotNull @Min(1) Long batchId,
            @Min(1) int quantityAdded,
            UUID requestId
    ) {
        public AddItemRequest(Long slotId, Long batchId, int quantityAdded) {
            this(slotId, batchId, quantityAdded, null);
        }
    }

    public record ItemResponse(
            Long id,
            Long slotId,
            String slotCode,
            Long batchId,
            String batchCode,
            String productName,
            int quantityAdded
    ) {
        public ItemResponse(Long id, Long slotId, Long batchId, int quantityAdded) {
            this(id, slotId, null, batchId, null, null, quantityAdded);
        }

        public static ItemResponse from(RestockItem item) {
            return new ItemResponse(
                    item.getId(),
                    item.getSlotId(),
                    item.getSlotCode(),
                    item.getBatchId(),
                    item.getBatchCode(),
                    item.getProductName(),
                    item.getQuantityAdded()
            );
        }
    }

    public record SessionResponse(
            Long id,
            String sessionCode,
            Long machineId,
            UUID operatorId,
            RestockSessionStatus status,
            LocalDateTime startedAt,
            LocalDateTime completedAt,
            String notes,
            List<ItemResponse> items
    ) {
        public static SessionResponse from(RestockSession session) {
            List<ItemResponse> itemResponses = session.getItems() == null
                    ? List.of()
                    : session.getItems().stream()
                        .map(ItemResponse::from)
                        .toList();

            return new SessionResponse(
                    session.getId(),
                    session.getSessionCode(),
                    session.getMachineId(),
                    session.getOperatorId(),
                    session.getStatus(),
                    session.getStartedAt(),
                    session.getCompletedAt(),
                    session.getNotes(),
                    itemResponses
            );
        }
    }
}
