package com.example.app.repository;

import com.example.app.entity.Order;
import com.example.app.entity.PaymentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface OrderRepository extends JpaRepository<Order, Long> {
    Optional<Order> findByOrderCode(String orderCode);

    @Query(value = "SELECT COUNT(*) FROM orders WHERE DATE(created_at) = CURRENT_DATE", nativeQuery = true)
    long countTodayOrders();

    // Sum revenue today
    @Query(value = "SELECT COALESCE(SUM(total_amount), 0) FROM orders WHERE payment_status = 'SUCCESS' AND DATE(created_at) = CURRENT_DATE", nativeQuery = true)
    BigDecimal sumTodayRevenue();

    // Sum revenue this month
    @Query(value = "SELECT COALESCE(SUM(total_amount), 0) FROM orders WHERE payment_status = 'SUCCESS' AND EXTRACT(MONTH FROM created_at) = EXTRACT(MONTH FROM CURRENT_DATE) AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE)", nativeQuery = true)
    BigDecimal sumThisMonthRevenue();

    // Count order status
    long countByPaymentStatus(PaymentStatus paymentStatus);

    // Get daily revenue in date range
    @Query(value = "SELECT DATE(created_at) as orderDate, COALESCE(SUM(total_amount), 0) as dailyRevenue " +
                   "FROM orders WHERE payment_status = 'SUCCESS' AND created_at >= :startDate " +
                   "GROUP BY DATE(created_at) ORDER BY DATE(created_at) ASC", nativeQuery = true)
    List<Object[]> findDailyRevenueFrom(@Param("startDate") LocalDateTime startDate);

    // Export CSV date filter
    List<Order> findByCreatedAtBetweenOrderByCreatedAtDesc(LocalDateTime from, LocalDateTime to);
}