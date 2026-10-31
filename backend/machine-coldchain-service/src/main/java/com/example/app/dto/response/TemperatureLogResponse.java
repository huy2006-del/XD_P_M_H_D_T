package com.example.app.dto.response;

import com.example.app.entity.TemperatureLog;

import java.time.LocalDateTime;

public record TemperatureLogResponse(
        Long id,
        Long machineId,
        Double temperature,
        Double humidity,
        LocalDateTime recordedAt
) {
    public static TemperatureLogResponse from(TemperatureLog log) {
        return new TemperatureLogResponse(
                log.getId(),
                log.getMachine().getId(),
                log.getTemperature(),
                log.getHumidity(),
                log.getRecordedAt()
        );
    }
}
