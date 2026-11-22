import { axiosInstance } from '../../shared/api/axiosInstance';
import { useAuthStore } from '../auth/authStore';

export type AlertType =
  | 'TEMP_HIGH'
  | 'TEMP_LOW'
  | 'DOOR_AJAR'
  | 'MOTOR_JAM'
  | 'OFFLINE'
  | string;

export type AlertSeverity = 'WARNING' | 'CRITICAL';
export type AlertStatus = 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED';

export type MachineStatusValue =
  | 'ONLINE'
  | 'OFFLINE'
  | 'MAINTENANCE'
  | 'ERROR'
  | 'OUT_OF_ORDER';

export interface AlertItem {
  id: number;
  machineId: number;
  machineName?: string;
  alertType: AlertType;
  severity: AlertSeverity;
  message: string;
  status: AlertStatus;
  createdAt: string;
  resolvedAt?: string | null;
  resolvedBy?: string | null;
  resolutionNote?: string | null;
}

export interface AlertQueryParams {
  status?: AlertStatus;
  severity?: AlertSeverity;
  machineId?: number;
}

export const alertService = {
  getAlerts: async (params?: AlertQueryParams): Promise<AlertItem[]> => {
    const res = await axiosInstance.get<AlertItem[]>('/api/v1/alerts', { params });
    return Array.isArray(res.data) ? res.data : [];
  },

  acknowledgeAlert: async (id: number): Promise<AlertItem> => {
    const res = await axiosInstance.patch<AlertItem>(`/api/v1/alerts/${id}/acknowledge`);
    return res.data;
  },

  resolveAlert: async (id: number, resolutionNote: string): Promise<AlertItem> => {
    const trimmedNote = resolutionNote.trim();
    if (!trimmedNote) {
      throw new Error('Ghi chú khắc phục là bắt buộc.');
    }
    const resolvedBy = useAuthStore.getState().userProfile?.username || 'admin';
    const res = await axiosInstance.patch<AlertItem>(`/api/v1/alerts/${id}/resolve`, {
      resolutionNote: trimmedNote,
      resolvedBy,
    });
    return res.data;
  },

  updateMachineStatus: async (machineId: number, status: MachineStatusValue) => {
    const res = await axiosInstance.patch(`/api/v1/machines/${machineId}/status`, {
      status,
    });
    return res.data;
  },
};