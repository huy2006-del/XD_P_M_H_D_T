package com.example.app.service;

import com.example.app.dto.BatchRequest;
import com.example.app.dto.BatchResponse;
import com.example.app.entity.FruitBatch;
import com.example.app.entity.Product;
import com.example.app.exception.ResourceNotFoundException;
import com.example.app.repository.FruitBatchRepository;
import com.example.app.repository.ProductRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;

@Service
@Transactional
public class BatchService {
    private final FruitBatchRepository batches;
    private final ProductRepository products;

    public BatchService(FruitBatchRepository batches, ProductRepository products) {
        this.batches = batches;
        this.products = products;
    }

    /**
     * @param expired            true: chỉ lấy lô đã hết hạn
     * @param expiringWithinDays n: chỉ lấy lô còn hàng, sắp hết hạn trong n ngày tới (kể cả hôm nay)
     */
    @Transactional(readOnly = true)
    public Page<BatchResponse> list(Long productId, Boolean expired, Integer expiringWithinDays, int page, int size) {
        if (page < 0) throw new IllegalArgumentException("page must be >= 0");
        if (size < 1 || size > 100) throw new IllegalArgumentException("size must be between 1 and 100");
        if (expiringWithinDays != null && expiringWithinDays < 0) {
            throw new IllegalArgumentException("expiringWithinDays must be >= 0");
        }
