package com.example.app.dto;

import java.io.Serializable;
import java.time.LocalDateTime;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DispenseCommandMessage implements Serializable {

    private String orderId;
    private Integer slot;
    private Long machineId;
    private LocalDateTime timestamp;
    private Integer retryCount;
}