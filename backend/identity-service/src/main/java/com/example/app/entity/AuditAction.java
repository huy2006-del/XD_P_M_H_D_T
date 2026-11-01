package com.example.app.entity;

public enum AuditAction {
    USER_LOGIN,
    USER_CREATED,
    RESTOCK_COMPLETED,   // Operator hoàn tất nạp hàng
    ALERT_RESOLVED,      // Operator giải quyết cảnh báo nhiệt độ
    THRESHOLD_UPDATED    // Admin cập nhật dải nhiệt độ an toàn
}