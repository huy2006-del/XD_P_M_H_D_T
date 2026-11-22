import { axiosInstance } from '../../../shared/api/axiosInstance';
import { alertService, type AlertItem } from '../../alerts/alertService';
import type { MachineDetailDto } from '../../coldchain/types';

export interface AnalyticsOverviewDto {
  todayRevenue: number;
  thisMonthRevenue: number;
  successOrderCount: number;
  failedOrderCount: number;
  inventoryFillRate: number;
}

export interface DailyRevenueDto {
  date: string;
  revenue: number;
}

export interface StableMachineDto {
  machineId: number;
  serialNumber: string;
  name: string;
  locationName: string;
  complianceRate: number;
  totalPings: number;
  inRangePings: number;
}

export interface CriticalMachineSummaryDto {
  machineId: number;
  serialNumber: string;
  name: string;
  criticalAlertCount: number;
}

export interface ColdChainHealthReportDto {
  reportGeneratedAt: string;
  systemMttrMinutes: number;
  topStableMachines: StableMachineDto[];
  criticalAlertMachines: CriticalMachineSummaryDto[];
}

export interface DashboardData {
  overview: AnalyticsOverviewDto | null;
  revenueChart: Array<{ date: string; label: string; revenue: number }>;
  machines: MachineDetailDto[];
  alerts: AlertItem[];
  coldChainHealth: ColdChainHealthReportDto | null;
  fetchedAt: string;
  partialErrors: string[];
}

function formatShortDate(isoDate: string): string {
  const parts = isoDate.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}`;
  }
  return isoDate;
}

export const adminDashboardService = {
  getDashboardData: async (revenueDays = 7): Promise<DashboardData> => {
    const partialErrors: string[] = [];

    const [overviewRes, revenueRes, machinesRes, alertsRes, healthRes] =
      await Promise.allSettled([
        axiosInstance.get<AnalyticsOverviewDto>('/api/v1/analytics/overview'),
        axiosInstance.get<DailyRevenueDto[]>('/api/v1/analytics/revenue-chart', {
          params: { range: revenueDays },
        }),
        axiosInstance.get<MachineDetailDto[]>('/api/v1/machines'),
        alertService.getAlerts(),
        axiosInstance.get<ColdChainHealthReportDto>('/api/v1/reports/coldchain-health'),
      ]);

    const overview =
      overviewRes.status === 'fulfilled'
        ? {
            todayRevenue: Number(overviewRes.value.data?.todayRevenue ?? 0),
            thisMonthRevenue: Number(overviewRes.value.data?.thisMonthRevenue ?? 0),
            successOrderCount: Number(overviewRes.value.data?.successOrderCount ?? 0),
            failedOrderCount: Number(overviewRes.value.data?.failedOrderCount ?? 0),
            inventoryFillRate: Number(overviewRes.value.data?.inventoryFillRate ?? 0),
          }
        : (partialErrors.push('Không tải được thống kê doanh thu (/api/v1/analytics/overview).'),
          null);

    const revenueChart =
      revenueRes.status === 'fulfilled' && Array.isArray(revenueRes.value.data)
        ? revenueRes.value.data.map((item) => ({
            date: item.date,
            label: formatShortDate(item.date),
            revenue: Number(item.revenue ?? 0),
          }))
        : (partialErrors.push('Không tải được biểu đồ doanh thu (/api/v1/analytics/revenue-chart).'),
          []);

    const machines =
      machinesRes.status === 'fulfilled' && Array.isArray(machinesRes.value.data)
        ? machinesRes.value.data
        : (partialErrors.push('Không tải được danh sách máy (/api/v1/machines).'), []);

    const alerts =
      alertsRes.status === 'fulfilled'
        ? alertsRes.value
        : (partialErrors.push('Không tải được danh sách cảnh báo (/api/v1/alerts).'), []);

    const coldChainHealth =
      healthRes.status === 'fulfilled'
        ? healthRes.value.data
        : (partialErrors.push('Không tải được báo cáo sức khỏe chuỗi lạnh (/api/v1/reports/coldchain-health).'),
          null);

    return {
      overview,
      revenueChart,
      machines,
      alerts,
      coldChainHealth,
      fetchedAt: new Date().toISOString(),
      partialErrors,
    };
  },

  exportRevenueReport: async (): Promise<void> => {
    const response = await axiosInstance.get<Blob>('/api/v1/reports/export-csv', {
      responseType: 'blob',
    });

    const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute(
      'download',
      `Bao_Cao_Don_Hang_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },
};