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
import jakarta.persistence.UniqueConstraint;

/** Số quả của một lô đang thực tế nằm trong một khay. */
@Entity
@Table(name = "slot_batch_inventory",
        uniqueConstraints = @UniqueConstraint(name = "uk_slot_batch", columnNames = {"slot_id", "batch_id"}))
public class SlotBatchInventory {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Chưa có bảng Slot trong dự án nên lưu id thuần, không khóa ngoại. */
    @Column(name = "slot_id", nullable = false)
    private Long slotId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "batch_id", nullable = false)
    private FruitBatch batch;

    @Column(nullable = false)
    private int quantity;

    protected SlotBatchInventory() {}

    public SlotBatchInventory(Long slotId, FruitBatch batch, int quantity) {
        this.slotId = slotId;
        this.batch = batch;
        this.quantity = quantity;
    }

    public void add(int amount) { this.quantity += amount; }

    public void remove(int amount) {
        if (amount <= 0 || amount > quantity) {
            throw new IllegalStateException("Cannot remove " + amount + " from slot quantity " + quantity);
        }
        this.quantity -= amount;
    }

    public Long getId() { return id; }
    public Long getSlotId() { return slotId; }
    public FruitBatch getBatch() { return batch; }
    public int getQuantity() { return quantity; }
}
