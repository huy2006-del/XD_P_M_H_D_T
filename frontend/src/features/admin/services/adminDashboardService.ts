import { axiosInstance } from '../../../shared/api/axiosInstance';
import { alertService, type AlertItem } from '../../alerts/alertService';
import type { MachineDetailDto } from '../../coldchain/types';

export type RevenueRangeDays = 7 | 14 | 30;

export interface AnalyticsOverviewDto {
  todayRevenue: number;
  thisMonthRevenue: number;
  successOrderCount: number;
  failedOrderCount: number;
  inventoryFillRate: number | null;
}

export interface DailyRevenuePoint {
  date: string;
  label: string;
  revenue: number;
  orderCount: number;
}

export interface OrderStatusBreakdown {
  total: number;
  success: number;
  pendingPayment: number;
  dispensing: number;
  dispenseError: number;
  paymentFailed: number;
}

export interface RankedMetricItem {
  id: string;
  name: string;
  subLabel?: string;
  revenue: number;
  quantity: number;
  orderCount: number;
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
  criticalAlerts?: Array<{
    id?: number;
    message?: string;
    severity?: string;
    status?: string;
    createdAt?: string;
  }>;
}

export interface ColdChainHealthReportDto {
  reportGeneratedAt: string;
  systemMttrMinutes: number;
  topStableMachines: StableMachineDto[];
  criticalAlertMachines: CriticalMachineSummaryDto[];
}

export interface DashboardData {
  rangeDays: RevenueRangeDays;
  fromDate: string;
  toDate: string;
  overview: AnalyticsOverviewDto | null;
  revenueChart: DailyRevenuePoint[];
  rangeRevenueTotal: number;
  orderBreakdown: OrderStatusBreakdown;
  topProducts: RankedMetricItem[];
  topLocations: RankedMetricItem[];
  machines: MachineDetailDto[];
  alerts: AlertItem[];
  coldChainHealth: ColdChainHealthReportDto | null;
  fetchedAt: string;
  partialErrors: string[];
}

interface DailyRevenueApiDto {
  date: string;
  revenue: number | string;
}

interface OrderItemApiDto {
  productId: number;
  productName?: string;
  quantity: number;
  unitPrice?: number | string;
  subtotal?: number | string;
}

interface OrderApiDto {
  id: number;
  orderCode: string;
  machineId: number;
  totalAmount: number | string;
  paymentStatus: string;
  dispenseStatus: string;
  createdAt: string;
  items?: OrderItemApiDto[];
}

interface ProductLookupDto {
  id: number;
  name?: string;
}

interface ProductPageDto {
  content?: ProductLookupDto[];
  totalPages?: number;
}

function formatShortDate(isoDate: string): string {
  const parts = isoDate.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}`;
  }
  return isoDate;
}

function toLocalDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function extractProducts(raw: ProductLookupDto[] | ProductPageDto | undefined): ProductLookupDto[] {
  if (Array.isArray(raw)) return raw;
  if (raw && Array.isArray(raw.content)) return raw.content;
  return [];
}

async function fetchAllProducts(): Promise<ProductLookupDto[]> {
  const firstRes = await axiosInstance.get<ProductLookupDto[] | ProductPageDto>(
    '/api/v1/products',
    { params: { page: 0 } }
  );
  const firstData = firstRes.data;
  if (Array.isArray(firstData)) return firstData;

  const products = [...extractProducts(firstData)];
  const totalPages = Math.min(Number(firstData?.totalPages ?? 1), 20);
  if (totalPages <= 1) return products;

  const rest = await Promise.allSettled(
    Array.from({ length: totalPages - 1 }, (_, i) =>
      axiosInstance.get<ProductLookupDto[] | ProductPageDto>('/api/v1/products', {
        params: { page: i + 1 },
      })
    )
  );
  for (const res of rest) {
    if (res.status === 'fulfilled') {
      products.push(...extractProducts(res.value.data));
    }
  }
  return products;
}

function classifyOrder(order: OrderApiDto): keyof Omit<OrderStatusBreakdown, 'total'> {
  if (order.dispenseStatus === 'JAMMED' || order.dispenseStatus === 'REFUNDED') {
    return 'dispenseError';
  }
  if (order.paymentStatus === 'FAILED') {
    return 'paymentFailed';
  }
  if (order.dispenseStatus === 'COMPLETED' || order.dispenseStatus === 'DISPENSED') {
    return 'success';
  }
  if (order.paymentStatus === 'SUCCESS') {
    return 'dispensing';
  }
  return 'pendingPayment';
}

export const adminDashboardService = {
  getDashboardData: async (rangeDays: RevenueRangeDays = 7): Promise<DashboardData> => {
    const partialErrors: string[] = [];
    const now = new Date();
    const start = new Date(now);
    start.setDate(start.getDate() - (rangeDays - 1));
    const fromDate = toLocalDateKey(start);
    const toDate = toLocalDateKey(now);

    const [
      overviewRes,
      revenueChartRes,
      ordersRes,
      machinesRes,
      alertsRes,
      healthRes,
      productsRes,
    ] = await Promise.allSettled([
      axiosInstance.get<AnalyticsOverviewDto>('/api/v1/analytics/overview'),
      axiosInstance.get<DailyRevenueApiDto[]>('/api/v1/analytics/revenue-chart', {
        params: { range: rangeDays },
      }),
      axiosInstance.get<OrderApiDto[]>('/api/v1/orders'),
      axiosInstance.get<MachineDetailDto[]>('/api/v1/machines'),
      alertService.getAlerts(),
      axiosInstance.get<ColdChainHealthReportDto>('/api/v1/reports/coldchain-health'),
      fetchAllProducts(),
    ]);

    const overview: AnalyticsOverviewDto | null =
      overviewRes.status === 'fulfilled' && overviewRes.value.data
        ? {
            todayRevenue: Number(overviewRes.value.data.todayRevenue ?? 0),
            thisMonthRevenue: Number(overviewRes.value.data.thisMonthRevenue ?? 0),
            successOrderCount: Number(overviewRes.value.data.successOrderCount ?? 0),
            failedOrderCount: Number(overviewRes.value.data.failedOrderCount ?? 0),
            inventoryFillRate:
              overviewRes.value.data.inventoryFillRate != null
                ? Number(overviewRes.value.data.inventoryFillRate)
                : null,
          }
        : (partialErrors.push('Không tải được tổng quan doanh thu (/api/v1/analytics/overview).'),
          null);

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
        : (partialErrors.push(
            'Không tải được báo cáo sức khỏe chuỗi lạnh (/api/v1/reports/coldchain-health).'
          ),
          null);

    const allOrders =
      ordersRes.status === 'fulfilled' && Array.isArray(ordersRes.value.data)
        ? ordersRes.value.data
        : (partialErrors.push('Không tải được chi tiết đơn hàng (/api/v1/orders).'), []);

    const productNameMap = new Map<number, string>();
    if (productsRes.status === 'fulfilled') {
      for (const p of productsRes.value) {
        if (p.id != null && p.name) {
          productNameMap.set(p.id, p.name);
        }
      }
    }

    const machineMap = new Map<number, MachineDetailDto>();
    for (const m of machines) {
      machineMap.set(m.id, m);
    }

    // Lọc đơn hàng trong đúng khoảng [fromDate, toDate] để khớp với rangeDays của revenue-chart
    const ordersInRange = allOrders.filter((order) => {
      const key = order.createdAt?.slice(0, 10);
      return Boolean(key && key >= fromDate && key <= toDate);
    });

    const orderBreakdown: OrderStatusBreakdown = {
      total: ordersInRange.length,
      success: 0,
      pendingPayment: 0,
      dispensing: 0,
      dispenseError: 0,
      paymentFailed: 0,
    };

    const dailyOrderCounts = new Map<string, number>();
    const productStats = new Map<number, RankedMetricItem>();
    const locationStats = new Map<string, RankedMetricItem>();

    for (const order of ordersInRange) {
      const bucket = classifyOrder(order);
      orderBreakdown[bucket] += 1;

      const dateKey = order.createdAt.slice(0, 10);
      dailyOrderCounts.set(dateKey, (dailyOrderCounts.get(dateKey) ?? 0) + 1);

      // Chỉ tính doanh thu Top sản phẩm & Top địa điểm cho đơn đã thanh toán và không bị hoàn tiền do kẹt hàng
      if (order.paymentStatus === 'SUCCESS' && bucket !== 'dispenseError') {
        const orderAmount = Number(order.totalAmount ?? 0);
        const machine = machineMap.get(order.machineId);
        const locationKey =
          machine?.location?.name || machine?.locationName || `Máy #${order.machineId}`;
        const locationSub = machine
          ? `${machine.name} (${machine.serialNumber})`
          : `ID #${order.machineId}`;

        const existingLoc = locationStats.get(locationKey) ?? {
          id: locationKey,
          name: locationKey,
          subLabel: locationSub,
          revenue: 0,
          quantity: 0,
          orderCount: 0,
        };
        existingLoc.revenue += orderAmount;
        existingLoc.orderCount += 1;

        for (const item of order.items ?? []) {
          const qty = Number(item.quantity ?? 0);
          const itemRevenue =
            item.subtotal != null
              ? Number(item.subtotal)
              : Number(item.unitPrice ?? 0) * qty;
          existingLoc.quantity += qty;

          const pName =
            item.productName ||
            productNameMap.get(item.productId) ||
            `Sản phẩm #${item.productId}`;
          const existingProd = productStats.get(item.productId) ?? {
            id: String(item.productId),
            name: pName,
            revenue: 0,
            quantity: 0,
            orderCount: 0,
          };
          existingProd.revenue += itemRevenue;
          existingProd.quantity += qty;
          existingProd.orderCount += 1;
          productStats.set(item.productId, existingProd);
        }

        locationStats.set(locationKey, existingLoc);
      }
    }

    let revenueChart: DailyRevenuePoint[] = [];
    if (revenueChartRes.status === 'fulfilled' && Array.isArray(revenueChartRes.value.data)) {
      revenueChart = revenueChartRes.value.data.map((row) => ({
        date: row.date,
        label: formatShortDate(row.date),
        revenue: Number(row.revenue ?? 0),
        orderCount: dailyOrderCounts.get(row.date) ?? 0,
      }));
    } else {
      partialErrors.push(
        `Không tải được biểu đồ doanh thu (/api/v1/analytics/revenue-chart?range=${rangeDays}).`
      );
    }

    const rangeRevenueTotal = revenueChart.reduce((sum, item) => sum + item.revenue, 0);

    const topProducts = [...productStats.values()]
      .sort((a, b) => b.revenue - a.revenue || b.quantity - a.quantity)
      .slice(0, 5);

    const topLocations = [...locationStats.values()]
      .sort((a, b) => b.revenue - a.revenue || b.orderCount - a.orderCount)
      .slice(0, 5);

    return {
      rangeDays,
      fromDate,
      toDate,
      overview,
      revenueChart,
      rangeRevenueTotal,
      orderBreakdown,
      topProducts,
      topLocations,
      machines,
      alerts,
      coldChainHealth,
      fetchedAt: new Date().toISOString(),
      partialErrors,
    };
  },

  exportRevenueReport: async (from?: string, to?: string): Promise<void> => {
    const response = await axiosInstance.get<Blob>('/api/v1/reports/export-csv', {
      params: {
        ...(from ? { from } : {}),
        ...(to ? { to } : {}),
      },
      responseType: 'blob',
    });

    const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const suffix =
      from && to ? `${from}_to_${to}` : new Date().toISOString().slice(0, 10);
    link.setAttribute('download', `Bao_Cao_Don_Hang_${suffix}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },
};