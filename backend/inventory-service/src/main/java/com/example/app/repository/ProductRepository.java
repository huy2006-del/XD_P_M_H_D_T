package com.example.app.repository;

import com.example.app.entity.Product;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ProductRepository extends JpaRepository<Product, Long> {
    boolean existsBySkuIgnoreCase(String sku);
    boolean existsBySkuIgnoreCaseAndIdNot(String sku, Long id);

    @Query("select p from Product p where lower(p.name) like lower(concat('%', :keyword, '%')) and (:active is null or p.isActive = :active)")
    Page<Product> search(@Param("keyword") String keyword, @Param("active") Boolean active, Pageable pageable);
}
