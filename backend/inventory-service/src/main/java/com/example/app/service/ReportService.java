package com.example.app.service;

import com.example.app.entity.Order;
import com.example.app.repository.OrderRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.StringWriter;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ReportService {

    private final OrderRepository orderRepository;

    @Transactional(readOnly = true)
    public String exportOrderCsv(LocalDate fromDate, LocalDate toDate) {
        LocalDateTime from = (fromDate != null) ? fromDate.atStartOfDay() : LocalDate.now().minusDays(30).atStartOfDay();
        LocalDateTime to = (toDate != null) ? toDate.atTime(LocalTime.MAX) : LocalDateTime.now();

        List<Order> orders = orderRepository.findByCreatedAtBetweenOrderByCreatedAtDesc(from, to);

        StringWriter writer = new StringWriter();
        // Ghi UTF-8 BOM để Excel không lỗi font tiếng Việt
