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
