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
        LocalDate today = LocalDate.now();

        Specification<FruitBatch> spec = (root, cq, cb) -> cb.conjunction();
        if (productId != null) {
            spec = spec.and((root, cq, cb) -> cb.equal(root.get("product").get("id"), productId));
        }
        if (Boolean.TRUE.equals(expired)) {
            spec = spec.and((root, cq, cb) -> cb.lessThan(root.<LocalDate>get("expiryDate"), today));
        }
        if (expiringWithinDays != null) {
            LocalDate limit = today.plusDays(expiringWithinDays);
            spec = spec.and((root, cq, cb) -> cb.and(
                    cb.greaterThanOrEqualTo(root.<LocalDate>get("expiryDate"), today),
                    cb.lessThanOrEqualTo(root.<LocalDate>get("expiryDate"), limit),
                    cb.greaterThan(root.<Integer>get("quantityRemaining"), 0)));
        }
        PageRequest pageable = PageRequest.of(page, size, Sort.by("expiryDate").ascending().and(Sort.by("id")));
        return batches.findAll(spec, pageable).map(BatchResponse::from);
    }

    @Transactional(readOnly = true)
    public BatchResponse get(Long id) {
        return BatchResponse.from(batches.findById(id).orElseThrow(() -> new ResourceNotFoundException("Batch", id)));
    }

    public BatchResponse create(BatchRequest r) {
        Product product = products.findById(r.productId())
                .orElseThrow(() -> new ResourceNotFoundException("Product", r.productId()));
        String code = r.batchCode().trim();
        if (batches.existsByBatchCodeIgnoreCase(code)) {
            throw new IllegalArgumentException("Batch code already exists: " + code);
        }
        LocalDate importDate = r.importDate() != null ? r.importDate() : LocalDate.now();
        if (r.expiryDate().isBefore(importDate)) {
            throw new IllegalArgumentException("expiryDate must not be before importDate");
        }
        FruitBatch batch = new FruitBatch(product, code, r.supplier(), importDate, r.expiryDate(),
                r.quantityImported(), r.unitCost());
        return BatchResponse.from(batches.save(batch));
    }
}
