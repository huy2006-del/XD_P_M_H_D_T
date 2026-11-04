package com.example.app.dto;

import java.time.LocalDate;
import java.util.List;

public record DispenseResultDTO(Long slotId, int requested, int dispensed, List<BatchDeduction> deductions) {

    /** Số quả đã lấy từ mỗi lô, theo đúng thứ tự trừ. */
    public record BatchDeduction(Long batchId, String batchCode, LocalDate expiryDate, int quantityTaken) {}
}
