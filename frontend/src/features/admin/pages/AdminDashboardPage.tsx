import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Download,
  ExternalLink,
  MapPin,
  Monitor,
  Package,
  RefreshCw,
  ShieldAlert,
  ShoppingBag,
  Thermometer,
  TrendingUp,
  Wifi,
  WifiOff,
  Wrench,
} from 'lucide-react';
import { toast } from 'sonner';

import { useWebSocketSubscription } from '../../../shared/realtime/useWebSocketSubscription';
import { CardSkeleton, Skeleton } from '../../../shared/components/ui/Skeleton';
import type { AlertItem } from '../../alerts/alertService';
import {
  adminDashboardService,
  type DashboardData,
  type RankedMetricItem,
  type RevenueRangeDays,
} from '../services/adminDashboardService';

type ColdChainWindow = '24H' | '7D' | '30D' | 'ALL';

function getAlertTimestampIso(alert: AlertItem): string | null {
  const record = alert as unknown as {
    createdAt?: string;
    triggeredAt?: string;
    timestamp?: string;
  };
  return record.createdAt || record.triggeredAt || record.timestamp || null;
}

function isWithinWindow(iso: string | null, windowFilter: ColdChainWindow): boolean {
  if (windowFilter === 'ALL' || !iso) return true;
  const ts = new Date(iso).getTime();
  if (Number.isNaN(ts)) return true;
  const diffMs = Date.now() - ts;
  if (windowFilter === '24H') return diffMs <= 24 * 60 * 60 * 1000;
  if (windowFilter === '7D') return diffMs <= 7 * 24 * 60 * 60 * 1000;
  return diffMs <= 30 * 24 * 60 * 60 * 1000;
}

function formatVnd(amount: number): string {
  return `${Math.round(amount).toLocaleString('vi-VN')} đ`;
}

export const AdminDashboardPage: React.FC = () => {
  const navigate = useNavigate();

  const [rangeDays, setRangeDays] = useState<RevenueRangeDays>(7);
  const [coldChainWindow, setColdChainWindow] = useState<ColdChainWindow>('7D');
  const [coldChainMachineFilter, setColdChainMachineFilter] = useState<string>('ALL');

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  const fetchData = useCallback(async (selectedRange: RevenueRangeDays) => {
    try {
      setLoading(true);
      const result = await adminDashboardService.getDashboardData(selectedRange);
      setData(result);
    } catch {
      toast.error('Không thể tải dữ liệu Dashboard từ Backend.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData(rangeDays);
  }, [fetchData, rangeDays]);

  const alertsWs = useWebSocketSubscription<AlertItem>('/topic/alerts', (incomingAlert) => {
    if (!incomingAlert?.id) return;
    setData((prev) => {
      if (!prev) return prev;
      const exists = prev.alerts.some((a) => a.id === incomingAlert.id);
      const nextAlerts = exists
        ? prev.alerts.map((a) => (a.id === incomingAlert.id ? incomingAlert : a))
        : [incomingAlert, ...prev.alerts];
      return {
        ...prev,
        alerts: nextAlerts,
        fetchedAt: new Date().toISOString(),
      };
    });
    if (incomingAlert.severity === 'CRITICAL') {
      void fetchData(rangeDays);
    }
  });

  const handleExportReport = async () => {
    try {
      setIsExporting(true);
      await adminDashboardService.exportRevenueReport(data?.fromDate, data?.toDate);
      toast.success(
        `Đã xuất CSV đơn hàng (${data?.fromDate ?? 'đầu kỳ'} → ${data?.toDate ?? 'hôm nay'}).`
      );
    } catch {
      toast.error('Không thể tải báo cáo từ /api/v1/reports/export-csv.');
    } finally {
      setIsExporting(false);
    }
  };

  // 8.16: Thống kê đội máy từ cùng nguồn /api/v1/machines với FleetDashboard
  const fleetStats = useMemo(() => {
    const list = data?.machines ?? [];
    const online = list.filter((m) => m.status === 'ONLINE').length;
    const offline = list.filter((m) => m.status === 'OFFLINE').length;
    const maintenance = list.filter((m) => m.status === 'MAINTENANCE').length;
    const outOfOrder = list.filter(
      (m) => m.status === 'OUT_OF_ORDER' || m.status === 'ERROR'
    ).length;
    return { total: list.length, online, offline, maintenance, outOfOrder };
  }, [data?.machines]);

  const machineMap = useMemo(() => {
    const map = new Map<number, { name: string; serial: string }>();
    for (const m of data?.machines ?? []) {
      map.set(m.id, { name: m.name, serial: m.serialNumber });
    }
    return map;
  }, [data?.machines]);

  const unresolvedAlerts = useMemo(
    () => (data?.alerts ?? []).filter((a) => a.status !== 'RESOLVED'),
    [data?.alerts]
  );

  // 8.18: Máy hiện đang vượt ngưỡng nhiệt độ cài đặt
  const outOfRangeMachines = useMemo(() => {
    return (data?.machines ?? []).filter((m) => {
      if (m.currentTemp == null) return false;
      const min = m.tempMinThreshold ?? 2;
      const max = m.tempMaxThreshold ?? 8;
      return m.currentTemp < min || m.currentTemp > max;
    });
  }, [data?.machines]);

  const filteredColdChainAlerts = useMemo(() => {
    return (data?.alerts ?? []).filter((alert) => {
      if (
        coldChainMachineFilter !== 'ALL' &&
        String(alert.machineId) !== coldChainMachineFilter
      ) {
        return false;
      }
      return isWithinWindow(getAlertTimestampIso(alert), coldChainWindow);
    });
  }, [data?.alerts, coldChainMachineFilter, coldChainWindow]);

  const filteredCriticalMachines = useMemo(() => {
    const list = data?.coldChainHealth?.criticalAlertMachines ?? [];
    if (coldChainMachineFilter === 'ALL') return list;
    return list.filter((m) => String(m.machineId) === coldChainMachineFilter);
  }, [data?.coldChainHealth?.criticalAlertMachines, coldChainMachineFilter]);

  const filteredStableMachines = useMemo(() => {
    const list = data?.coldChainHealth?.topStableMachines ?? [];
    if (coldChainMachineFilter === 'ALL') return list;
    return list.filter((m) => String(m.machineId) === coldChainMachineFilter);
  }, [data?.coldChainHealth?.topStableMachines, coldChainMachineFilter]);

  const firstAlertMachineId =
    unresolvedAlerts[0]?.machineId ?? data?.machines?.[0]?.id ?? 1;

  // Skeleton cho lần tải đầu (Task 8.19)
  if (loading && !data) {
    return (
      <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-8 w-72" />
            <Skeleton className="h-4 w-56" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-10 w-28" />
            <Skeleton className="h-10 w-40" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-gray-100 space-y-4">
            <Skeleton className="h-6 w-52" />
            <Skeleton className="h-64 w-full" />
          </div>
          <CardSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6 font-sans text-gray-800">
      {/* HEADER + TRẠNG THÁI ĐỒNG BỘ & WEBSOCKET */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            Dashboard Tổng Quan Admin
          </h1>
          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 mt-1.5">
            <span className="inline-flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              Cập nhật lúc:{' '}
              <strong>
                {data?.fetchedAt
                  ? new Date(data.fetchedAt).toLocaleString('vi-VN')
                  : '--'}
              </strong>
            </span>

            <span
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border font-semibold ${
                alertsWs.isConnected
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-red-50 text-red-700 border-red-200'
              }`}
            >
              {alertsWs.isConnected ? (
                <>
                  <Wifi className="w-3 h-3" /> WebSocket Alerts kết nối
                </>
              ) : (
                <>
                  <WifiOff className="w-3 h-3" /> WebSocket mất kết nối
                  <button
                    type="button"
                    onClick={alertsWs.reconnect}
                    className="ml-1 underline text-blue-700"
                  >
                    Kết nối lại
                  </button>
                </>
              )}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1 text-xs font-semibold">
            {([7, 14, 30] as RevenueRangeDays[]).map((days) => (
              <button
                key={days}
                type="button"
                onClick={() => setRangeDays(days)}
                className={`px-3 py-1.5 rounded-md transition-colors ${
                  rangeDays === days
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {days} ngày
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => void fetchData(rangeDays)}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Làm mới
          </button>

          <button
            type="button"
            onClick={() => void handleExportReport()}
            disabled={isExporting}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 shadow-sm"
          >
            <Download className="w-4 h-4" />
            {isExporting ? 'Đang xuất...' : `Xuất CSV (${rangeDays} ngày)`}
          </button>
        </div>
      </div>

      {/* CẢNH BÁO NẾU CÓ API LỖI CỤC BỘ */}
      {data && data.partialErrors.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-xl p-4 text-xs space-y-1">
          <div className="flex items-center justify-between gap-2">
            <p className="font-bold">Một số API Backend chưa phản hồi đầy đủ:</p>
            <button
              type="button"
              onClick={() => void fetchData(rangeDays)}
              className="underline font-semibold"
            >
              Thử lại
            </button>
          </div>
          <ul className="list-disc pl-5 space-y-0.5">
            {data.partialErrors.map((err, idx) => (
              <li key={idx}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {/* TASK 8.16: KPI TỔNG QUAN DOANH THU & ĐỘI MÁY (CÓ LINK TỚI DANH SÁCH LỌC SẴN) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Doanh Thu Tháng Này"
          value={data?.overview ? formatVnd(data.overview.thisMonthRevenue) : 'Chưa có dữ liệu'}
          subText={
            data?.overview
              ? `Hôm nay: ${formatVnd(data.overview.todayRevenue)} • ${rangeDays} ngày: ${formatVnd(data.rangeRevenueTotal)}`
              : 'Nguồn: /api/v1/analytics/overview'
          }
          icon={<TrendingUp className="w-5 h-5" />}
          color="text-blue-600"
          bg="bg-blue-50"
          onClick={() => navigate('/admin/orders')}
        />

        <KpiCard
          title="Đơn Hàng & Lấp Đầy Kho"
          value={data?.overview ? `${data.overview.successOrderCount} thành công` : '--'}
          subText={
            data?.overview
              ? `Thất bại: ${data.overview.failedOrderCount} • Lấp đầy kho: ${
                  data.overview.inventoryFillRate != null
                    ? `${data.overview.inventoryFillRate.toFixed(1)}%`
                    : 'Chưa có dữ liệu'
                }`
              : 'Nguồn: /api/v1/analytics/overview'
          }
          icon={<ShoppingBag className="w-5 h-5" />}
          color="text-emerald-600"
          bg="bg-emerald-50"
          onClick={() => navigate('/admin/orders?status=SUCCESS')}
        />

        <KpiCard
          title="Máy Đang Hoạt Động"
          value={`${fleetStats.online} / ${fleetStats.total}`}
          subText={`Offline: ${fleetStats.offline} • Bảo trì: ${fleetStats.maintenance} • Lỗi: ${fleetStats.outOfOrder}`}
          icon={<Monitor className="w-5 h-5" />}
          color="text-indigo-600"
          bg="bg-indigo-50"
          onClick={() => navigate('/admin/machines?status=ONLINE')}
        />

        <KpiCard
          title="Cảnh Báo Chưa Xử Lý"
          value={String(unresolvedAlerts.length)}
          subText={
            data?.coldChainHealth
              ? `MTTR trung bình: ${data.coldChainHealth.systemMttrMinutes.toFixed(1)} phút • ${outOfRangeMachines.length} máy vượt ngưỡng`
              : `${outOfRangeMachines.length} máy hiện vượt ngưỡng nhiệt`
          }
          icon={<AlertTriangle className="w-5 h-5" />}
          color="text-red-600"
          bg="bg-red-50"
          onClick={() => navigate(`/admin/machines/${firstAlertMachineId}/coldchain`)}
        />
      </div>

      {/* THANH PHÂN RÃ TRẠNG THÁI ĐỘI MÁY (CLICK ĐI THẲNG TỚI FLEET ĐÃ LỌC) */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <h2 className="text-sm font-bold text-gray-900">
            Trạng thái đội máy (đồng bộ trực tiếp từ /api/v1/machines)
          </h2>
          <button
            type="button"
            onClick={() => navigate('/admin/machines')}
            className="text-xs font-semibold text-blue-600 hover:text-blue-800 inline-flex items-center gap-1"
          >
            Xem toàn bộ đội máy <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <FleetQuickLink
            label="Online"
            count={fleetStats.online}
            badgeClass="bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100/70"
            icon={<CheckCircle2 className="w-4 h-4" />}
            onClick={() => navigate('/admin/machines?status=ONLINE')}
          />
          <FleetQuickLink
            label="Offline"
            count={fleetStats.offline}
            badgeClass="bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
            icon={<WifiOff className="w-4 h-4" />}
            onClick={() => navigate('/admin/machines?status=OFFLINE')}
          />
          <FleetQuickLink
            label="Bảo trì"
            count={fleetStats.maintenance}
            badgeClass="bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100/70"
            icon={<Wrench className="w-4 h-4" />}
            onClick={() => navigate('/admin/machines?status=MAINTENANCE')}
          />
          <FleetQuickLink
            label="Lỗi / Ngừng hoạt động"
            count={fleetStats.outOfOrder}
            badgeClass="bg-red-50 text-red-700 border-red-200 hover:bg-red-100/70"
            icon={<ShieldAlert className="w-4 h-4" />}
            onClick={() => navigate('/admin/machines?status=OUT_OF_ORDER')}
          />
        </div>
      </div>

      {/* TASK 8.17: BIỂU ĐỒ DOANH THU + PHÂN RÃ TRẠNG THÁI ĐƠN HÀNG THEO BỘ LỌC NGÀY */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 lg:col-span-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div>
              <h2 className="text-base font-bold text-gray-900">
                Doanh Thu {rangeDays} Ngày Gần Nhất
              </h2>
              <p className="text-xs text-gray-500">
                Khoảng lọc: {data?.fromDate} → {data?.toDate} • Nguồn: GET
                /api/v1/analytics/revenue-chart?range={rangeDays}
              </p>
            </div>
            <div className="text-right">
              <span className="text-[11px] text-gray-400 block">Tổng doanh thu kỳ lọc</span>
              <span className="text-base font-black text-blue-600">
                {formatVnd(data?.rangeRevenueTotal ?? 0)}
              </span>
            </div>
          </div>

          {!data?.revenueChart.length ? (
            <div className="h-72 flex items-center justify-center bg-gray-50 rounded-xl border border-dashed border-gray-200 text-sm text-gray-500">
              Chưa có dữ liệu doanh thu trong {rangeDays} ngày qua.
            </div>
          ) : (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data.revenueChart}
                  margin={{ top: 10, right: 10, left: 6, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis
                    dataKey="label"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#6B7280', fontSize: 11 }}
                  />
                  <YAxis
                    tickFormatter={(val) =>
                      Number(val) >= 1_000_000
                        ? `${(Number(val) / 1_000_000).toFixed(1)}M`
                        : `${Number(val).toLocaleString('vi-VN')}`
                    }
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#6B7280', fontSize: 11 }}
                  />
                  <RechartsTooltip
                    cursor={{ fill: '#F3F4F6' }}
                    formatter={(value) => [
                      `${Number(value || 0).toLocaleString('vi-VN')} VNĐ`,
                      'Doanh thu',
                    ]}
                  />
                  <Bar
                    dataKey="revenue"
                    fill="#2563EB"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={36}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* PHÂN RÃ TRẠNG THÁI ĐƠN HÀNG (THÀNH CÔNG / CHỜ THANH TOÁN / LỖI DISPENSE) */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-base font-bold text-gray-900">
                  Trạng thái đơn ({rangeDays} ngày)
                </h2>
                <p className="text-xs text-gray-500">
                  Tổng: {data?.orderBreakdown.total ?? 0} đơn từ /api/v1/orders
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigate('/admin/orders')}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800"
              >
                Chi tiết →
              </button>
            </div>

            <div className="space-y-2.5">
              <OrderStatusRow
                label="Thành công (Đã nhả hàng)"
                count={data?.orderBreakdown.success ?? 0}
                total={data?.orderBreakdown.total ?? 0}
                colorClass="bg-emerald-500"
                badgeClass="bg-emerald-50 text-emerald-700"
                onClick={() => navigate('/admin/orders?status=SUCCESS')}
              />
              <OrderStatusRow
                label="Chờ thanh toán"
                count={data?.orderBreakdown.pendingPayment ?? 0}
                total={data?.orderBreakdown.total ?? 0}
                colorClass="bg-amber-400"
                badgeClass="bg-amber-50 text-amber-800"
                onClick={() => navigate('/admin/orders?status=PENDING_PAYMENT')}
              />
              <OrderStatusRow
                label="Đã thanh toán • Đang nhả"
                count={data?.orderBreakdown.dispensing ?? 0}
                total={data?.orderBreakdown.total ?? 0}
                colorClass="bg-blue-500"
                badgeClass="bg-blue-50 text-blue-700"
                onClick={() => navigate('/admin/orders?status=DISPENSING')}
              />
              <OrderStatusRow
                label="Lỗi dispense (Kẹt hàng / Hoàn tiền)"
                count={data?.orderBreakdown.dispenseError ?? 0}
                total={data?.orderBreakdown.total ?? 0}
                colorClass="bg-red-500"
                badgeClass="bg-red-50 text-red-700"
                onClick={() => navigate('/admin/orders?status=REFUNDED_JAMMED')}
              />
              <OrderStatusRow
                label="Thanh toán thất bại"
                count={data?.orderBreakdown.paymentFailed ?? 0}
                total={data?.orderBreakdown.total ?? 0}
                colorClass="bg-rose-400"
                badgeClass="bg-rose-50 text-rose-700"
                onClick={() => navigate('/admin/orders?status=PAYMENT_FAILED')}
              />
            </div>
          </div>

          <p className="mt-4 pt-3 border-t border-gray-100 text-[11px] text-gray-500">
            Bấm vào từng dòng trạng thái để mở trang Quản lý Đơn hàng đã lọc sẵn.
          </p>
        </div>
      </div>

      {/* TOP SẢN PHẨM & TOP ĐỊA ĐIỂM TRONG KỲ LỌC */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RankedListCard
          title={`Top sản phẩm (${rangeDays} ngày)`}
          subtitle="Tổng hợp từ đơn đã thanh toán (/api/v1/orders + /api/v1/products)"
          emptyText={`Chưa có đơn hàng thành công trong ${rangeDays} ngày qua để xếp hạng sản phẩm.`}
          icon={<Package className="w-4 h-4 text-blue-600" />}
          items={data?.topProducts ?? []}
          unitLabel="sp"
        />

        <RankedListCard
          title={`Top địa điểm (${rangeDays} ngày)`}
          subtitle="Tổng hợp theo địa điểm đặt máy (/api/v1/orders + /api/v1/machines)"
          emptyText={`Chưa có đơn hàng thành công trong ${rangeDays} ngày qua để xếp hạng địa điểm.`}
          icon={<MapPin className="w-4 h-4 text-emerald-600" />}
          items={data?.topLocations ?? []}
          unitLabel="đơn"
          useOrderCount
        />
      </div>

      {/* TASK 8.18: SỨC KHỎE CHUỖI LẠNH (MÁY VƯỢT NGƯỠNG, CRITICAL, MTTR, FILTER THỜI GIAN & MÁY) */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-gray-100 pb-4">
          <div>
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Thermometer className="w-5 h-5 text-red-500" />
              Sức khỏe chuỗi lạnh &amp; Sự cố nhiệt độ
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Dữ liệu thực đo từ /api/v1/reports/coldchain-health và /api/v1/alerts (không dùng số liệu uptime tĩnh).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={coldChainWindow}
              onChange={(e) => setColdChainWindow(e.target.value as ColdChainWindow)}
              className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg bg-white font-medium"
            >
              <option value="24H">Cảnh báo: 24 giờ qua</option>
              <option value="7D">Cảnh báo: 7 ngày qua</option>
              <option value="30D">Cảnh báo: 30 ngày qua</option>
              <option value="ALL">Cảnh báo: Tất cả thời gian</option>
            </select>

            <select
              value={coldChainMachineFilter}
              onChange={(e) => setColdChainMachineFilter(e.target.value)}
              className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg bg-white font-medium"
            >
              <option value="ALL">Tất cả máy ({data?.machines.length ?? 0})</option>
              {(data?.machines ?? []).map((m) => (
                <option key={m.id} value={String(m.id)}>
                  {m.name} ({m.serialNumber})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 3 chỉ số đo thật từ Backend */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl border border-red-100 bg-red-50/40">
            <p className="text-xs text-gray-500 font-medium">Máy đang vượt ngưỡng nhiệt</p>
            <p className="text-2xl font-black text-red-600 mt-1">
              {outOfRangeMachines.length} / {fleetStats.total}
            </p>
            <p className="text-[11px] text-gray-500 mt-1">
              So sánh currentTemp với [tempMinThreshold, tempMaxThreshold].
            </p>
          </div>

          <div className="p-4 rounded-xl border border-amber-100 bg-amber-50/40">
            <p className="text-xs text-gray-500 font-medium">Cảnh báo CRITICAL theo bộ lọc</p>
            <p className="text-2xl font-black text-amber-700 mt-1">
              {filteredColdChainAlerts.filter((a) => a.severity === 'CRITICAL').length}
            </p>
            <p className="text-[11px] text-gray-500 mt-1">
              Tổng cảnh báo khớp lọc: {filteredColdChainAlerts.length} (đang mở:{' '}
              {filteredColdChainAlerts.filter((a) => a.status !== 'RESOLVED').length})
            </p>
          </div>

          <div className="p-4 rounded-xl border border-emerald-100 bg-emerald-50/40">
            <p className="text-xs text-gray-500 font-medium flex items-center gap-1">
              <Activity className="w-3.5 h-3.5 text-emerald-600" />
              Thời gian xử lý trung bình (MTTR)
            </p>
            <p className="text-2xl font-black text-emerald-700 mt-1">
              {data?.coldChainHealth
                ? `${data.coldChainHealth.systemMttrMinutes.toFixed(1)} phút`
                : 'Chưa có dữ liệu'}
            </p>
            <p className="text-[11px] text-gray-500 mt-1">
              Tính từ các cảnh báo đã RESOLVED do Backend trả về.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Cột trái: Máy có cảnh báo CRITICAL + Cảnh báo gần nhất theo bộ lọc */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-gray-800">
              Máy có sự cố CRITICAL &amp; Cảnh báo khớp bộ lọc
            </h3>

            {filteredCriticalMachines.length > 0 && (
              <div className="space-y-2">
                {filteredCriticalMachines.map((item) => (
                  <button
                    key={item.machineId}
                    type="button"
                    onClick={() => navigate(`/admin/machines/${item.machineId}/coldchain`)}
                    className="w-full text-left p-3 rounded-xl border border-red-200 bg-red-50/50 hover:bg-red-50 flex items-center justify-between gap-3 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-gray-900 truncate">
                        {item.name}{' '}
                        <span className="font-mono text-xs text-gray-500">
                          ({item.serialNumber})
                        </span>
                      </p>
                      <p className="text-xs text-red-700">
                        {item.criticalAlertCount} cảnh báo CRITICAL được Backend ghi nhận
                      </p>
                    </div>
                    <span className="text-xs font-bold text-blue-700 shrink-0 inline-flex items-center gap-1">
                      Chi tiết <ExternalLink className="w-3.5 h-3.5" />
                    </span>
                  </button>
                ))}
              </div>
            )}

            {filteredColdChainAlerts.length === 0 ? (
              <div className="p-6 text-center text-xs text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                Không có cảnh báo chuỗi lạnh nào trong khoảng thời gian / máy đã chọn.
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {filteredColdChainAlerts.slice(0, 8).map((alert) => {
                  const mInfo = machineMap.get(alert.machineId);
                  const ts = getAlertTimestampIso(alert);
                  return (
                    <button
                      key={alert.id}
                      type="button"
                      onClick={() => navigate(`/admin/machines/${alert.machineId}/coldchain`)}
                      className="w-full text-left p-3 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                              alert.severity === 'CRITICAL'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {alert.severity}
                          </span>
                          <span className="text-xs font-semibold text-gray-700">
                            {mInfo ? `${mInfo.name} (${mInfo.serial})` : `Máy #${alert.machineId}`}
                          </span>
                        </div>
                        <span className="text-[11px] text-gray-400">
                          {alert.status}
                          {ts ? ` • ${new Date(ts).toLocaleString('vi-VN')}` : ''}
                        </span>
                      </div>
                      <p className="text-xs text-gray-700 line-clamp-2">{alert.message}</p>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Cột phải: Tỷ lệ tuân thủ nhiệt độ thực đo theo từng máy */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-gray-800">
              Tỷ lệ ping nhiệt độ trong ngưỡng (đo từ lịch sử telemetry)
            </h3>

            {filteredStableMachines.length === 0 ? (
              <div className="p-6 text-center text-xs text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                Backend chưa có thống kê tuân thủ nhiệt độ cho bộ lọc hiện tại.
              </div>
            ) : (
              <div className="overflow-x-auto border border-gray-100 rounded-xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-gray-50 text-gray-500 border-b border-gray-100">
                    <tr>
                      <th className="p-3 font-semibold">Máy</th>
                      <th className="p-3 font-semibold">Ping đạt / Tổng</th>
                      <th className="p-3 font-semibold text-right">Tuân thủ</th>
                      <th className="p-3 font-semibold text-right">Giám sát</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredStableMachines.map((m) => (
                      <tr key={m.machineId} className="hover:bg-gray-50/70">
                        <td className="p-3">
                          <div className="font-semibold text-gray-900">{m.name}</div>
                          <div className="text-[11px] text-gray-400">
                            {m.serialNumber} • {m.locationName || 'Chưa rõ vị trí'}
                          </div>
                        </td>
                        <td className="p-3 font-mono text-gray-700">
                          {m.totalPings > 0
                            ? `${m.inRangePings} / ${m.totalPings}`
                            : 'Chưa có ping'}
                        </td>
                        <td className="p-3 text-right font-bold">
                          {m.totalPings > 0 ? (
                            <span
                              className={
                                m.complianceRate >= 90
                                  ? 'text-emerald-600'
                                  : m.complianceRate >= 70
                                  ? 'text-amber-600'
                                  : 'text-red-600'
                              }
                            >
                              {m.complianceRate.toFixed(1)}%
                            </span>
                          ) : (
                            <span className="text-gray-400">--</span>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          <button
                            type="button"
                            onClick={() => navigate(`/admin/machines/${m.machineId}/coldchain`)}
                            className="text-blue-600 hover:text-blue-800 font-semibold"
                          >
                            Mở →
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const KpiCard: React.FC<{
  title: string;
  value: string;
  subText: string;
  icon: React.ReactNode;
  color: string;
  bg: string;
  onClick?: () => void;
}> = ({ title, value, subText, icon, color, bg, onClick }) => (
  <div
    onClick={onClick}
    className={`bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-start justify-between gap-3 ${
      onClick ? 'cursor-pointer hover:shadow-md hover:border-blue-200 transition-all' : ''
    }`}
  >
    <div className="min-w-0">
      <p className="text-xs font-semibold text-gray-500 mb-1">{title}</p>
      <p className={`text-xl md:text-2xl font-black truncate ${color}`}>{value}</p>
      <p className="text-[11px] text-gray-500 mt-1 line-clamp-2">{subText}</p>
    </div>
    <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center shrink-0 ${color}`}>
      {icon}
    </div>
  </div>
);

const FleetQuickLink: React.FC<{
  label: string;
  count: number;
  badgeClass: string;
  icon: React.ReactNode;
  onClick: () => void;
}> = ({ label, count, badgeClass, icon, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`p-3 rounded-xl border text-left transition-colors flex items-center justify-between gap-2 ${badgeClass}`}
  >
    <div className="flex items-center gap-2 min-w-0">
      {icon}
      <span className="text-xs font-semibold truncate">{label}</span>
    </div>
    <span className="text-lg font-black">{count}</span>
  </button>
);

const OrderStatusRow: React.FC<{
  label: string;
  count: number;
  total: number;
  colorClass: string;
  badgeClass: string;
  onClick: () => void;
}> = ({ label, count, total, colorClass, badgeClass, onClick }) => {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left p-2.5 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors space-y-1.5"
    >
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="font-medium text-gray-700">{label}</span>
        <span className={`px-2 py-0.5 rounded-full font-bold ${badgeClass}`}>
          {count} ({pct}%)
        </span>
      </div>
      <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${colorClass}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </button>
  );
};

const RankedListCard: React.FC<{
  title: string;
  subtitle: string;
  emptyText: string;
  icon: React.ReactNode;
  items: RankedMetricItem[];
  unitLabel: string;
  useOrderCount?: boolean;
}> = ({ title, subtitle, emptyText, icon, items, unitLabel, useOrderCount }) => {
  const maxRevenue = Math.max(...items.map((i) => i.revenue), 1);

  return (
    <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
      <div className="mb-4">
        <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
          {icon}
          {title}
        </h2>
        <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>
      </div>

      {items.length === 0 ? (
        <div className="p-6 text-center text-xs text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-200">
          {emptyText}
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item, idx) => {
            const widthPct = Math.max(6, Math.round((item.revenue / maxRevenue) * 100));
            return (
              <div key={item.id} className="space-y-1">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <div className="min-w-0">
                    <span className="font-bold text-gray-900">
                      #{idx + 1} {item.name}
                    </span>
                    {item.subLabel && (
                      <span className="text-gray-400 ml-1.5">• {item.subLabel}</span>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-bold text-gray-900">{formatVnd(item.revenue)}</span>
                    <span className="text-gray-400 ml-1.5">
                      ({useOrderCount ? item.orderCount : item.quantity} {unitLabel})
                    </span>
                  </div>
                </div>
                <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 rounded-full"
                    style={{ width: `${widthPct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};