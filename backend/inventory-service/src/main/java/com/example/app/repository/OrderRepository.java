package com.example.app.repository;

import com.example.app.entity.Order;
import com.example.app.entity.PaymentStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
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

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT o FROM Order o WHERE o.orderCode = :orderCode")
    Optional<Order> findByOrderCodeForUpdate(@Param("orderCode") String orderCode);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT o FROM Order o WHERE o.id = :id")
    Optional<Order> findByIdForUpdate(@Param("id") Long id);

    @Query(value = "SELECT COUNT(*) FROM orders WHERE DATE(created_at) = CURRENT_DATE", nativeQuery = true)
    long countTodayOrders();

    // Sum revenue today
    @Query(value = "SELECT COALESCE(SUM(total_amount), 0) FROM orders WHERE payment_status = 'SUCCESS' "
            + "AND created_at >= CURRENT_DATE AND created_at < CURRENT_DATE + 1", nativeQuery = true)
    BigDecimal sumTodayRevenue();

    // Sum revenue this month
    @Query(value = "SELECT COALESCE(SUM(total_amount), 0) FROM orders WHERE payment_status = 'SUCCESS' "
            + "AND created_at >= date_trunc('month', CURRENT_DATE) "
            + "AND created_at < date_trunc('month', CURRENT_DATE) + interval '1 month'", nativeQuery = true)
    BigDecimal sumThisMonthRevenue();

    @Query(value = "SELECT COALESCE(SUM(total_amount), 0) FROM orders " +
                   "WHERE payment_status = 'SUCCESS' " +
                   "AND (:machineId IS NULL OR machine_id = :machineId) " +
                   "AND created_at >= :from AND created_at <= :to", nativeQuery = true)
    BigDecimal sumRevenueFiltered(@Param("machineId") Long machineId,
                                  @Param("from") LocalDateTime from,
                                  @Param("to") LocalDateTime to);

    // Count order status
    long countByPaymentStatus(PaymentStatus paymentStatus);

    @Query("SELECT COUNT(o) FROM Order o WHERE o.paymentStatus = :status " +
           "AND (:machineId IS NULL OR o.machineId = :machineId) " +
           "AND o.createdAt >= :from AND o.createdAt <= :to")
    long countByPaymentStatusFiltered(@Param("status") PaymentStatus status,
                                      @Param("machineId") Long machineId,
                                      @Param("from") LocalDateTime from,
                                      @Param("to") LocalDateTime to);

    // Get daily revenue in date range
    @Query(value = "SELECT DATE(created_at) as orderDate, COALESCE(SUM(total_amount), 0) as dailyRevenue " +
                   "FROM orders WHERE payment_status = 'SUCCESS' AND created_at >= :startDate " +
                   "AND (:machineId IS NULL OR machine_id = :machineId) " +
                   "GROUP BY DATE(created_at) ORDER BY DATE(created_at) ASC", nativeQuery = true)
    List<Object[]> findDailyRevenueFrom(@Param("startDate") LocalDateTime startDate,
                                        @Param("machineId") Long machineId);

    @Query(value = """
            SELECT CAST(o.created_at AS date), SUM(CASE WHEN CAST(:productId AS bigint) IS NULL THEN o.total_amount ELSE line.revenue END)
            FROM orders o
            LEFT JOIN (
                SELECT order_id, SUM(subtotal) AS revenue FROM order_items
                WHERE product_id = :productId GROUP BY order_id
            ) line ON line.order_id = o.id
            WHERE o.payment_status = 'SUCCESS'
              AND (CAST(:productId AS bigint) IS NULL OR line.order_id IS NOT NULL)
              AND (CAST(:machineId AS bigint) IS NULL OR o.machine_id = :machineId)
              AND o.created_at >= :from AND o.created_at < :until
            GROUP BY CAST(o.created_at AS date)
            """, nativeQuery = true)
    List<Object[]> findDailyRevenueBetween(Long machineId, Long productId, LocalDateTime from, LocalDateTime until);

    @Query(value = """
            SELECT COUNT(*) FROM orders o
            WHERE o.payment_status = :status
              AND (CAST(:machineId AS bigint) IS NULL OR o.machine_id = :machineId)
              AND o.created_at >= :from AND o.created_at < :until
              AND EXISTS (SELECT 1 FROM order_items i WHERE i.order_id = o.id AND i.product_id = :productId)
            """, nativeQuery = true)
    long countOrdersForProduct(String status, Long machineId, Long productId, LocalDateTime from, LocalDateTime until);

    @Query(value = """
            SELECT machine_id, COUNT(*), SUM(total_amount)
            FROM orders
            WHERE payment_status = 'SUCCESS' AND created_at >= :from AND created_at < :until
            GROUP BY machine_id
            """, nativeQuery = true)
    List<Object[]> findRevenueByMachine(LocalDateTime from, LocalDateTime until);

    @Query(value = "SELECT oi.product_id, COALESCE(p.name, CONCAT('SP #', oi.product_id)) AS product_name, " +
                   "COALESCE(SUM(oi.quantity), 0) AS total_qty, COALESCE(SUM(oi.subtotal), 0) AS total_rev " +
                   "FROM order_items oi " +
                   "JOIN orders o ON o.id = oi.order_id " +
                   "LEFT JOIN products p ON p.id = oi.product_id " +
                   "WHERE o.payment_status = 'SUCCESS' " +
                   "AND (:machineId IS NULL OR o.machine_id = :machineId) " +
                   "AND o.created_at >= :from AND o.created_at <= :to " +
                   "GROUP BY oi.product_id, p.name " +
                   "ORDER BY total_rev DESC", nativeQuery = true)
    List<Object[]> findRevenueByProduct(@Param("machineId") Long machineId,
                                        @Param("from") LocalDateTime from,
                                        @Param("to") LocalDateTime to);

    @Query(value = "SELECT CAST(EXTRACT(HOUR FROM created_at) AS INTEGER) AS order_hour, " +
                   "COUNT(*) AS order_count, COALESCE(SUM(total_amount), 0) AS total_rev " +
                   "FROM orders " +
                   "WHERE payment_status = 'SUCCESS' " +
                   "AND (:machineId IS NULL OR machine_id = :machineId) " +
                   "AND created_at >= :from AND created_at <= :to " +
                   "GROUP BY order_hour ORDER BY order_hour ASC", nativeQuery = true)
    List<Object[]> findPeakHoursRevenue(@Param("machineId") Long machineId,
                                        @Param("from") LocalDateTime from,
                                        @Param("to") LocalDateTime to);

    // Export CSV date filter
    List<Order> findByCreatedAtBetweenOrderByCreatedAtDesc(LocalDateTime from, LocalDateTime to);

    List<Order> findByMachineIdAndCreatedAtBetweenOrderByCreatedAtDesc(Long machineId, LocalDateTime from, LocalDateTime to);
}
