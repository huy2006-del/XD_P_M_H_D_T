import { axiosInstance } from '../../../shared/api/axiosInstance';
import { alertService, type AlertItem } from '../../alerts/alertService';
import type { MachineDetailDto } from '../../coldchain/types';

export interface AnalyticsOverviewDto {
  todayRevenue: number;
  thisMonthRevenue: number;
  successOrderCount: number;
  failedOrderCount: number;
  inventoryFillRate: number | null;
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

interface DashboardOrder {
  totalAmount: number | string;
  paymentStatus: string;
  dispenseStatus: string;
  createdAt: string;
}

function formatShortDate(isoDate: string): string {
  const parts = isoDate.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}`;
  }
  return isoDate;
}
function localDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export const adminDashboardService = {
  getDashboardData: async (revenueDays = 7): Promise<DashboardData> => {
    const partialErrors: string[] = [];

    const [ordersRes, machinesRes, alertsRes, healthRes] =
      await Promise.allSettled([
        axiosInstance.get<DashboardOrder[]>('/api/v1/orders'),
        axiosInstance.get<MachineDetailDto[]>('/api/v1/machines'),
        alertService.getAlerts(),
        axiosInstance.get<ColdChainHealthReportDto>('/api/v1/reports/coldchain-health'),
      ]);

    const orders = ordersRes.status === 'fulfilled' && Array.isArray(ordersRes.value.data)
      ? ordersRes.value.data
      : (partialErrors.push('Không tải được danh sách đơn hàng (/api/v1/orders).'), []);
    const paidOrders = orders.filter((order) =>
      order.paymentStatus === 'SUCCESS' && ['COMPLETED', 'DISPENSED'].includes(order.dispenseStatus)
    );
    const failedOrders = orders.filter((order) => ['FAILED', 'JAMMED', 'REFUNDED'].includes(order.paymentStatus) || ['JAMMED', 'REFUNDED'].includes(order.dispenseStatus));
    const now = new Date();
    const today = localDateKey(now);
    const month = today.slice(0, 7);
    const revenueFor = (list: DashboardOrder[]) => list.reduce((sum, order) => sum + Number(order.totalAmount || 0), 0);
    const overview: AnalyticsOverviewDto | null = ordersRes.status === 'fulfilled' ? {
      todayRevenue: revenueFor(paidOrders.filter((order) => order.createdAt.slice(0, 10) === today)),
      thisMonthRevenue: revenueFor(paidOrders.filter((order) => order.createdAt.slice(0, 7) === month)),
      successOrderCount: orders.filter((order) => ['COMPLETED', 'DISPENSED'].includes(order.dispenseStatus)).length,
      failedOrderCount: failedOrders.length,
      inventoryFillRate: null,
    } : null;
    const revenueByDate = new Map<string, number>();
    for (let dayOffset = revenueDays - 1; dayOffset >= 0; dayOffset -= 1) {
      const date = new Date(now);
      date.setDate(date.getDate() - dayOffset);
      revenueByDate.set(localDateKey(date), 0);
    }
    for (const order of paidOrders) {
      const date = order.createdAt.slice(0, 10);
      if (revenueByDate.has(date)) revenueByDate.set(date, (revenueByDate.get(date) ?? 0) + Number(order.totalAmount || 0));
    }
    const revenueChart = [...revenueByDate].map(([date, revenue]) => ({ date, label: formatShortDate(date), revenue }));

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
