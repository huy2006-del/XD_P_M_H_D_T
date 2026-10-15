package com.example.app.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "products")
public class Product {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 150)
    private String name;

    @Column(nullable = false, unique = true, length = 80)
    private String sku;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal price;

    @Column(nullable = false, length = 20)
    private String unit;

    @Column(name = "image_url", length = 1000)
    private String imageUrl;

    @Column(name = "shelf_life_days", nullable = false)
    private Integer shelfLifeDays;

    @Column(name = "min_temp_c", nullable = false, precision = 5, scale = 2)
    private BigDecimal minTempC;

    @Column(name = "max_temp_c", nullable = false, precision = 5, scale = 2)
    private BigDecimal maxTempC;

    @Column(name = "is_active", nullable = false)
    private boolean isActive = true;

    @Column(length = 2000)
    private String description;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected Product() {}

    public Product(String name, String sku, BigDecimal price, String unit, String imageUrl,
                   Integer shelfLifeDays, BigDecimal minTempC, BigDecimal maxTempC,
                   String description) {
        this.name = name;
        this.sku = sku;
        this.price = price;
        this.unit = unit;
        this.imageUrl = imageUrl;
        this.shelfLifeDays = shelfLifeDays;
        this.minTempC = minTempC;
        this.maxTempC = maxTempC;
        this.description = description;
        this.isActive = true;
    }

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void onUpdate() { updatedAt = Instant.now(); }

    public void update(String name, String sku, BigDecimal price, String unit, String imageUrl,
                       Integer shelfLifeDays, BigDecimal minTempC, BigDecimal maxTempC,
                       String description) {
        this.name = name; this.sku = sku; this.price = price; this.unit = unit;
        this.imageUrl = imageUrl; this.shelfLifeDays = shelfLifeDays;
        this.minTempC = minTempC; this.maxTempC = maxTempC; this.description = description;
    }
    public void changeActive(boolean active) { this.isActive = active; }
    public Long getId() { return id; }
    public String getName() { return name; }
    public String getSku() { return sku; }
    public BigDecimal getPrice() { return price; }
    public String getUnit() { return unit; }
    public String getImageUrl() { return imageUrl; }
    public Integer getShelfLifeDays() { return shelfLifeDays; }
    public BigDecimal getMinTempC() { return minTempC; }
    public BigDecimal getMaxTempC() { return maxTempC; }
    public boolean isActive() { return isActive; }
    public String getDescription() { return description; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}
