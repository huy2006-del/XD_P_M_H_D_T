package com.example.app.dto.response;

public record OperatorResponse(Long id, String fullName) {
    public static OperatorResponse from(Long operatorId) {
        return operatorId == null ? null : new OperatorResponse(operatorId, null);
    }
}
