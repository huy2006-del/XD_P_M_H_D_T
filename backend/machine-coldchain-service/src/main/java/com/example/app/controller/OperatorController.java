package com.example.app.controller;

import com.example.app.entity.Operator;
import com.example.app.repository.OperatorRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/operators")
public class OperatorController {

    private final OperatorRepository operatorRepository;

    public OperatorController(OperatorRepository operatorRepository) {
        this.operatorRepository = operatorRepository;
    }

    @PostMapping
    public ResponseEntity<Operator> createOperator(@RequestBody Operator operator) {
        Operator savedOperator = operatorRepository.save(operator);
        return ResponseEntity.status(HttpStatus.CREATED).body(savedOperator);
    }
}