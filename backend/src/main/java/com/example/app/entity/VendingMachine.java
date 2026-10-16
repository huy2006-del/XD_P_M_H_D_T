package com.example.app.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.Instant;

@Entity
@Table(name = "vending_machines")
public class VendingMachine {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank
    @Size(max = 80)
    @Column(name = "serial_number", nullable = false, unique = true, length = 80)
    private String serialNumber;

    @NotBlank
    @Size(max = 150)
    @Column(nullable = false, length = 150)
    private String name;

    @Size(max = 100)
    @Column(length = 100)
    private String model;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "location_id", nullable = false)
    private Location location;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private MachineStatus status = MachineStatus.ONLINE;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "operator_id", nullable = false)
    private Operator operator;

    @Column(name = "last_ping_at")
    private Instant lastPingAt;

    protected VendingMachine() {
    }

    public VendingMachine(String serialNumber, String name, String model, Location location, Operator operator) {
        this.serialNumber = serialNumber;
        this.name = name;
        this.model = model;
        this.location = location;
        this.operator = operator;
    }

    public Long getId() {
        return id;
    }

    public String getSerialNumber() {
        return serialNumber;
    }

    public String getName() {
        return name;
    }

    public String getModel() {
        return model;
    }

    public Location getLocation() {
        return location;
    }

    public MachineStatus getStatus() {
        return status;
    }

    public Operator getOperator() {
        return operator;
    }

    public Instant getLastPingAt() {
        return lastPingAt;
    }

    public void update(String serialNumber, String name, String model, Location location, Operator operator) {
        this.serialNumber = serialNumber;
        this.name = name;
        this.model = model;
        this.location = location;
        this.operator = operator;
    }

    public void changeStatus(MachineStatus status) {
        this.status = status;
    }
}
