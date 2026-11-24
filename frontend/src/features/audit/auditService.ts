import { axiosInstance } from '../../shared/api/axiosInstance';
import type { AuditLogItem, AuditFilterParams } from './types';

export const auditService = {
  async getAuditLogs(params?: AuditFilterParams): Promise<AuditLogItem[]> {
    const response = await axiosInstance.get<AuditLogItem[]>('/api/v1/audit-logs');
    let logs = Array.isArray(response.data) ? response.data : [];

    if (params?.username) {
      const username = params.username.trim().toLowerCase();
      logs = logs.filter((log) => log.username?.toLowerCase().includes(username));
    }
    if (params?.action) logs = logs.filter((log) => log.action === params.action);
    if (params?.startDate) {
      const start = new Date(`${params.startDate}T00:00:00`).getTime();
      logs = logs.filter((log) => new Date(log.createdAt).getTime() >= start);
    }
    if (params?.endDate) {
      const end = new Date(`${params.endDate}T23:59:59.999`).getTime();
      logs = logs.filter((log) => new Date(log.createdAt).getTime() <= end);
    }
    return logs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },
};
