package com.example.app.repository;

import com.example.app.entity.DispenseOperation;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DispenseOperationRepository extends JpaRepository<DispenseOperation, String> {
}
