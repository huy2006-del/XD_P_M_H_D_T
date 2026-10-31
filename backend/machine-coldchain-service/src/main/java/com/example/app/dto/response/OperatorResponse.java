package com.example.app.dto.response;

import com.example.app.entity.Operator;

public record OperatorResponse(Long id, String fullName) {
    public static OperatorResponse from(Operator operator) {
        return new OperatorResponse(operator.getId(), operator.getFullName());
    }
}
