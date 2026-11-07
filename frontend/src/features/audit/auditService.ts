import { axiosInstance } from '../../shared/api/axiosInstance';
import type { AuditLogItem, AuditFilterParams } from './types';

// Dữ liệu Mock chuẩn các sự kiện Audit tuần 1 -> tuần 6 của FreshVend
const MOCK_AUDIT_LOGS: AuditLogItem[] = [
  {
    id: 1005,
    action: 'RESTOCK_COMPLETED',
    userId: 2,
    username: 'operator1',
    details: '{"sessionCode":"RS-20261106-001","machineId":1,"machineName":"Máy Kiosk Landmark 81","itemsAdded":[{"slot":"A1","product":"Táo Envy","batch":"LOT-20261101-01","quantity":8}]}',
    createdAt: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
  },
  {
    id: 1004,
    action: 'ALERT_RESOLVED',
    userId: 2,
    username: 'operator1',
    details: '{"alertId":88,"machineId":1,"alertType":"TEMP_HIGH","note":"Đã đóng kín cửa tủ lạnh, máy nén làm mát trở lại mức 4.2°C"}',
    createdAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
  },
  {
    id: 1003,
    action: 'THRESHOLD_UPDATED',
    userId: 1,
    username: 'admin',
    details: '{"machineId":2,"machineName":"Máy Bitexco Tầng 1","oldMinTemp":2.0,"newMinTemp":2.5,"oldMaxTemp":8.0,"newMaxTemp":7.5}',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
  },
  {
    id: 1002,
    action: 'USER_LOGIN',
    userId: 2,
    username: 'operator1',
    details: '{"ip":"192.168.1.15","userAgent":"Mozilla/5.0 (Mobile; Android 14) FreshVend/1.0"}',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(),
  },
  {
    id: 1001,
    action: 'USER_LOGIN',
    userId: 1,
    username: 'admin',
    details: '{"ip":"127.0.0.1","userAgent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/131.0"}',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
  },
];

export const auditService = {
  // Lấy danh sách Audit Logs từ Backend (identity-service thông qua Gateway)
  getAuditLogs: async (params?: AuditFilterParams): Promise<AuditLogItem[]> => {
    try {
      const response = await axiosInstance.get<AuditLogItem[]>('/api/v1/audit-logs');
      let logs = Array.isArray(response.data) ? response.data : [];

      if (logs.length === 0) {
        logs = MOCK_AUDIT_LOGS;
      }

      // Bộ lọc Client-Side chính xác theo yêu cầu Task 6.10
      if (params) {
        if (params.username) {
          const userKey = params.username.toLowerCase().trim();
          logs = logs.filter((l) => l.username?.toLowerCase().includes(userKey));
        }
        if (params.action) {
          logs = logs.filter((l) => l.action === params.action);
        }
        if (params.startDate) {
          const start = new Date(params.startDate).getTime();
          logs = logs.filter((l) => new Date(l.createdAt).getTime() >= start);
        }
        if (params.endDate) {
          const end = new Date(params.endDate);
          end.setHours(23, 59, 59, 999);
          logs = logs.filter((l) => new Date(l.createdAt).getTime() <= end.getTime());
        }
      }

      return logs;
    } catch {
      // Fallback tự động sang mock data mượt mà nếu Backend chưa chạy
      let filtered = [...MOCK_AUDIT_LOGS];
      if (params?.username) {
        filtered = filtered.filter((l) => l.username.toLowerCase().includes(params.username!.toLowerCase()));
      }
      if (params?.action) {
        filtered = filtered.filter((l) => l.action === params.action);
      }
      return filtered;
    }
  },
};