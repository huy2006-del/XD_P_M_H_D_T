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
        writer.write("\uFEFF");

        // Header CSV
        writer.write("Mã Đơn Hàng,Mã Máy,Tổng Tiền (VND),Phương Thức,Thanh Toán,Nhả Hàng,Ngày Tạo\n");

        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

        for (Order order : orders) {
            writer.write(String.format("%s,%s,%s,%s,%s,%s,%s\n",
                    escapeCsv(order.getOrderCode()),
                    order.getMachineId() != null ? order.getMachineId() : "",
                    order.getTotalAmount() != null ? order.getTotalAmount().toPlainString() : "0",
                    order.getPaymentMethod(),
                    order.getPaymentStatus(),
                    order.getDispenseStatus(),
                    order.getCreatedAt() != null ? order.getCreatedAt().format(formatter) : ""
            ));
        }

        return writer.toString();
    }

    private String escapeCsv(String data) {
        if (data == null) return "";
        if (data.contains(",") || data.contains("\"") || data.contains("\n")) {
            data = data.replace("\"", "\"\"");
            return "\"" + data + "\"";
        }
        return data;
    }
}