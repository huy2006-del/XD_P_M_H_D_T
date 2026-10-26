package com.example.app.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

/** Lô hàng nhập về kho tổng. quantityRemaining = số quả còn lại của lô (chưa bán), kể cả phần đã nạp vào khay. */
@Entity
@Table(name = "fruit_batches", indexes = @Index(name = "idx_fruit_batches_expiry", columnList = "expiry_date"))
public class FruitBatch {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @Column(name = "batch_code", nullable = false, unique = true, length = 50)
    private String batchCode;

    @Column(length = 150)
    private String supplier;

    @Column(name = "import_date", nullable = false)
    private LocalDate importDate;

    @Column(name = "expiry_date", nullable = false)
    private LocalDate expiryDate;

    @Column(name = "quantity_imported", nullable = false)
    private int quantityImported;

    @Column(name = "quantity_remaining", nullable = false)
    private int quantityRemaining;

    @Column(name = "unit_cost", nullable = false, precision = 12, scale = 2)
    private BigDecimal unitCost;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected FruitBatch() {}

    public FruitBatch(Product product, String batchCode, String supplier, LocalDate importDate,
                      LocalDate expiryDate, int quantityImported, BigDecimal unitCost) {
        this.product = product;
        this.batchCode = batchCode;
        this.supplier = supplier;
        this.importDate = importDate;
        this.expiryDate = expiryDate;
        this.quantityImported = quantityImported;
        this.quantityRemaining = quantityImported;
        this.unitCost = unitCost;
    }

    @PrePersist
    void onCreate() { createdAt = Instant.now(); }

    /** Trừ số quả còn lại của lô. */
    public void deduct(int quantity) {
        if (quantity <= 0) throw new IllegalArgumentException("quantity must be > 0");
        if (quantity > quantityRemaining) {
            throw new IllegalStateException("Batch " + batchCode + " only has " + quantityRemaining + " items left");
        }
        quantityRemaining -= quantity;
    }

    public boolean isExpired(LocalDate today) { return expiryDate.isBefore(today); }

    public Long getId() { return id; }
    public Product getProduct() { return product; }
    public String getBatchCode() { return batchCode; }
    public String getSupplier() { return supplier; }
    public LocalDate getImportDate() { return importDate; }
    public LocalDate getExpiryDate() { return expiryDate; }
    public int getQuantityImported() { return quantityImported; }
    public int getQuantityRemaining() { return quantityRemaining; }
    public BigDecimal getUnitCost() { return unitCost; }
    public Instant getCreatedAt() { return createdAt; }
}
