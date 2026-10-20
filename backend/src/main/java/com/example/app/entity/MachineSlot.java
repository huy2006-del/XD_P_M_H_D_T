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
import jakarta.persistence.UniqueConstraint;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "machine_slots",
        uniqueConstraints = @UniqueConstraint(name = "uk_machine_slot_code", columnNames = {"machine_id", "slot_code"}))
@Getter
@NoArgsConstructor
public class MachineSlot {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "machine_id", nullable = false)
    private VendingMachine machine;

    @Column(name = "slot_code", nullable = false, length = 20)
    private String slotCode;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id")
    private Product product;

    @Column(nullable = false)
    private int capacity = 10;

    @Column(name = "current_stock", nullable = false)
    private int currentStock;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private MachineSlotStatus status = MachineSlotStatus.EMPTY;

    public MachineSlot(VendingMachine machine, String slotCode, Product product, int capacity) {
        this.machine = machine;
        this.slotCode = slotCode;
        this.product = product;
        this.capacity = capacity;
        this.currentStock = 0;
        this.status = MachineSlotStatus.EMPTY;
    }

    public void updateConfiguration(String slotCode, Product product, int capacity) {
        if (capacity < currentStock) {
            throw new IllegalArgumentException("Sức chứa không được nhỏ hơn tồn kho hiện tại.");
        }
        this.slotCode = slotCode;
        this.product = product;
        this.capacity = capacity;
        refreshStockStatus();
    }

    public void updateStock(int currentStock) {
        if (currentStock < 0 || currentStock > capacity) {
            throw new IllegalArgumentException("Tồn kho phải nằm trong khoảng từ 0 đến sức chứa khay.");
        }
        this.currentStock = currentStock;
        refreshStockStatus();
    }

    public void markJammed() {
        this.status = MachineSlotStatus.JAMMED;
    }

    public void changeStatus(MachineSlotStatus status) {
        if (status == MachineSlotStatus.EMPTY && currentStock != 0) {
            throw new IllegalArgumentException("Không thể đặt khay còn hàng sang trạng thái EMPTY.");
        }
        if (status == MachineSlotStatus.ACTIVE && currentStock == 0) {
            throw new IllegalArgumentException("Khay hết hàng không thể chuyển sang trạng thái ACTIVE.");
        }
        this.status = status;
    }

    private void refreshStockStatus() {
        if (status != MachineSlotStatus.JAMMED) {
            status = currentStock == 0 ? MachineSlotStatus.EMPTY : MachineSlotStatus.ACTIVE;
        }
    }
}
