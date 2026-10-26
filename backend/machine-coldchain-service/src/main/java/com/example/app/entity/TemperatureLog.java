package com.example.app.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "temperature_logs")
@Getter
@NoArgsConstructor
public class TemperatureLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "machine_id", nullable = false)
    private VendingMachine machine;

    @Column(nullable = false)
    private Double temperature;

    @Column(nullable = false)
    private Double humidity;

    @Column(name = "recorded_at", nullable = false)
    private LocalDateTime recordedAt;

    public TemperatureLog(VendingMachine machine, Double temperature, Double humidity, LocalDateTime recordedAt) {
        this.machine = machine;
        this.temperature = temperature;
        this.humidity = humidity;
        this.recordedAt = recordedAt;
    }
}
