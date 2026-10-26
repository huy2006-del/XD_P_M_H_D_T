package com.example.app.controller;

import com.example.app.dto.BatchRequest;
import com.example.app.dto.BatchResponse;
import com.example.app.service.BatchService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/batches")
public class BatchController {
    private final BatchService service;

    public BatchController(BatchService service) { this.service = service; }

    @GetMapping
    public Map<String, Object> list(@RequestParam(required = false) Long productId,
                                    @RequestParam(required = false) Boolean expired,
                                    @RequestParam(required = false) Integer expiringWithinDays,
                                    @RequestParam(defaultValue = "0") int page,
                                    @RequestParam(defaultValue = "10") int size) {
        Page<BatchResponse> result = service.list(productId, expired, expiringWithinDays, page, size);
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("content", result.getContent());
        body.put("page", result.getNumber());
        body.put("size", result.getSize());
        body.put("totalElements", result.getTotalElements());
        body.put("totalPages", result.getTotalPages());
        return body;
    }

    @GetMapping("/{id}")
    public BatchResponse get(@PathVariable Long id) { return service.get(id); }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public BatchResponse create(@Valid @RequestBody BatchRequest request) { return service.create(request); }
}
