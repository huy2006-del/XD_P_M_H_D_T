package com.example.app.entity;

import jakarta.persistence.*;
import lombok.*;
import java.util.UUID;

@Entity
@Table(name = "restock_items")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RestockItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "session_id", nullable = false)
    private RestockSession session;

    @Column(name = "slot_id", nullable = false)
    private Long slotId;

    @Column(name = "slot_code", nullable = false, length = 20)
    private String slotCode;

    @Column(name = "batch_id", nullable = false)
    private Long batchId;

    @Column(name = "batch_code", nullable = false, columnDefinition = "text")
    private String batchCode;

    @Column(name = "product_name", nullable = false, columnDefinition = "text")
    private String productName;

    @Column(name = "quantity_added", nullable = false)
    private int quantityAdded;

    @Column(name = "request_id")
    private UUID requestId;
}