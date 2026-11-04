import { axiosInstance } from '../../shared/api/axiosInstance';

export interface AlertItem {
  id: number;
  machineId: number;
  machineName?: string;
  alertType: 'TEMP_HIGH' | 'TEMP_LOW' | 'DOOR_AJAR' | 'MOTOR_JAM' | 'OFFLINE';
  severity: 'WARNING' | 'CRITICAL';
  message: string;
  status: 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED';
  createdAt: string;
}

export const alertService = {
  getAlerts: async (params?: { status?: string; severity?: string; machineId?: number }) => {
    const res = await axiosInstance.get<AlertItem[]>('/api/v1/alerts', { params });
    return res.data;
  },
  acknowledgeAlert: async (id: number) => {
    const res = await axiosInstance.patch(`/api/v1/alerts/${id}/acknowledge`);
    return res.data;
  },
  resolveAlert: async (id: number, notes: string) => {
    const res = await axiosInstance.patch(`/api/v1/alerts/${id}/resolve`, { notes });
    return res.data;
  },
};