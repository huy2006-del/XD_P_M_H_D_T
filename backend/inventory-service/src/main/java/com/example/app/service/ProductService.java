package com.example.app.service;

import com.example.app.dto.ProductRequest;
import com.example.app.dto.ProductResponse;
import com.example.app.entity.Product;
import com.example.app.exception.ResourceNotFoundException;
import com.example.app.repository.ProductRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Set;

@Service
@Transactional
public class ProductService {
    private static final Set<String> UNITS = Set.of("kg", "hộp", "quả", "phần");
    private final ProductRepository repository;

    public ProductService(ProductRepository repository) { this.repository = repository; }

    @Transactional(readOnly = true)
    public Page<ProductResponse> list(int page, int size, String keyword, Boolean active) {
        if (page < 0) throw new IllegalArgumentException("page must be >= 0");
        if (size < 1 || size > 100) throw new IllegalArgumentException("size must be between 1 and 100");
        return repository.search(blankToEmpty(keyword), active,
                PageRequest.of(page, size, Sort.by(Sort.Direction.ASC, "id"))).map(ProductResponse::from);
    }

    @Transactional(readOnly = true)
    public ProductResponse get(Long id) { return ProductResponse.from(find(id)); }

    public ProductResponse create(ProductRequest r) {
        validate(r);
        if (repository.existsBySkuIgnoreCase(r.sku().trim())) throw new IllegalArgumentException("SKU already exists: " + r.sku());
        Product p = new Product(clean(r.name()), r.sku().trim(), r.price(), r.unit(), r.imageUrl(),
                r.shelfLifeDays(), r.minTempC(), r.maxTempC(), r.description());
        return ProductResponse.from(repository.save(p));
    }

    public ProductResponse update(Long id, ProductRequest r) {
        validate(r);
        Product p = find(id);
        if (repository.existsBySkuIgnoreCaseAndIdNot(r.sku().trim(), id)) throw new IllegalArgumentException("SKU already exists: " + r.sku());
        p.update(clean(r.name()), r.sku().trim(), r.price(), r.unit(), r.imageUrl(),
                r.shelfLifeDays(), r.minTempC(), r.maxTempC(), r.description());
        return ProductResponse.from(repository.save(p));
    }

    public ProductResponse changeStatus(Long id, boolean active) {
        Product p = find(id);
        p.changeActive(active);
        return ProductResponse.from(repository.save(p));
    }

    public void delete(Long id) {
        Product p = find(id);
        repository.delete(p);
    }

    private Product find(Long id) { return repository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Product", id)); }
    private void validate(ProductRequest r) {
        if (!UNITS.contains(r.unit())) throw new IllegalArgumentException("unit must be one of: kg, hộp, quả, phần");
        if (r.minTempC().compareTo(r.maxTempC()) > 0) throw new IllegalArgumentException("minTempC must be less than or equal to maxTempC");
    }
    private String clean(String value) { return value.trim(); }
    private String blankToEmpty(String value) { return value == null ? "" : value.trim(); }
}