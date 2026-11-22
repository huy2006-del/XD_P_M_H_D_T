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
  Download,
  Monitor,
  RefreshCw,
  ShoppingBag,
  Thermometer,
  TrendingUp,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { toast } from 'sonner';

import { useWebSocketSubscription } from '../../../shared/realtime/useWebSocketSubscription';
import type { AlertItem } from '../../alerts/alertService';
import {
  adminDashboardService,
  type DashboardData,
} from '../services/adminDashboardService';

export const AdminDashboardPage: React.FC = () => {
  const navigate = useNavigate();

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const result = await adminDashboardService.getDashboardData(7);
      setData(result);
    } catch {
      toast.error('Không thể tải dữ liệu Dashboard từ Backend!');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  // Cập nhật realtime số cảnh báo chưa xử lý qua STOMP WebSocket /topic/alerts
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
      };
    });
    if (incomingAlert.severity === 'CRITICAL') {
      void fetchData();
    }
  });

  const handleExportReport = async () => {
    try {
      setIsExporting(true);
      await adminDashboardService.exportRevenueReport();
      toast.success('Đã xuất báo cáo đơn hàng CSV từ Backend!');
    } catch {
      toast.error('Không thể tải báo cáo từ /api/v1/reports/export-csv.');
    } finally {
      setIsExporting(false);
    }
  };

  const machineStats = useMemo(() => {
    const list = data?.machines ?? [];
    const online = list.filter((m) => m.status === 'ONLINE').length;
    const outOfOrder = list.filter(
      (m) => m.status === 'OUT_OF_ORDER' || m.status === 'ERROR'
    ).length;
    return { total: list.length, online, outOfOrder };
  }, [data?.machines]);

  const unresolvedAlerts = useMemo(
    () => (data?.alerts ?? []).filter((a) => a.status !== 'RESOLVED'),
    [data?.alerts]
  );

  if (loading && !data) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh]">
        <div className="text-base text-gray-500 animate-pulse font-medium">
          Đang tải dữ liệu tổng quan từ Backend...
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6 font-sans text-gray-800">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            Dashboard Tổng Quan Admin
          </h1>
          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 mt-1">
            <span>
              Đồng bộ gần nhất:{' '}
              <strong>
                {data?.fetchedAt
                  ? new Date(data.fetchedAt).toLocaleTimeString('vi-VN')
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
                  <Wifi className="w-3 h-3" /> Alerts WS kết nối
                </>
              ) : (
                <>
                  <WifiOff className="w-3 h-3" /> Alerts WS mất kết nối
                  <button
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

        <div className="flex items-center gap-2">
          <button
            onClick={() => void fetchData()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Làm mới
          </button>

          <button
            onClick={() => void handleExportReport()}
            disabled={isExporting}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 shadow-sm"
          >
            <Download className="w-4 h-4" />
            {isExporting ? 'Đang xuất...' : 'Xuất CSV Đơn Hàng'}
          </button>
        </div>
      </div>

      {data && data.partialErrors.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-xl p-4 text-xs space-y-1">
          <p className="font-bold">Một số API Backend hiện chưa phản hồi:</p>
          <ul className="list-disc pl-5 space-y-0.5">
            {data.partialErrors.map((err, idx) => (
              <li key={idx}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {/* 4 THẺ KPI TỪ BACKEND */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <KpiCard
          title="Doanh Thu Tháng Này"
          value={
            data?.overview
              ? `${data.overview.thisMonthRevenue.toLocaleString('vi-VN')} đ`
              : 'Chưa có dữ liệu'
          }
          subText={
            data?.overview
              ? `Hôm nay: ${data.overview.todayRevenue.toLocaleString('vi-VN')} đ`
              : 'Nguồn: /api/v1/analytics/overview'
          }
          icon={<TrendingUp className="w-5 h-5" />}
          color="text-blue-600"
          bg="bg-blue-50"
        />

        <KpiCard
          title="Đơn Hàng Thành Công"
          value={data?.overview ? String(data.overview.successOrderCount) : '--'}
          subText={
            data?.overview
              ? `Thất bại: ${data.overview.failedOrderCount} • Lấp đầy kho: ${data.overview.inventoryFillRate.toFixed(1)}%`
              : 'Nguồn: /api/v1/analytics/overview'
          }
          icon={<ShoppingBag className="w-5 h-5" />}
          color="text-emerald-600"
          bg="bg-emerald-50"
        />

        <KpiCard
          title="Số Máy Online"
          value={`${machineStats.online} / ${machineStats.total}`}
          subText={
            machineStats.outOfOrder > 0
              ? `${machineStats.outOfOrder} máy đang lỗi / ngừng hoạt động`
              : 'Tất cả máy trong trạng thái kiểm soát'
          }
          icon={<Monitor className="w-5 h-5" />}
          color="text-indigo-600"
          bg="bg-indigo-50"
          onClick={() => navigate('/admin/machines')}
        />

        <KpiCard
          title="Cảnh Báo Chưa Xử Lý"
          value={String(unresolvedAlerts.length)}
          subText={
            data?.coldChainHealth
              ? `MTTR xử lý sự cố: ${data.coldChainHealth.systemMttrMinutes.toFixed(1)} phút`
              : 'Nguồn: /api/v1/alerts'
          }
          icon={<AlertTriangle className="w-5 h-5" />}
          color="text-red-600"
          bg="bg-red-50"
          onClick={() =>
            navigate(`/admin/machines/${data?.machines?.[0]?.id ?? 1}/coldchain`)
          }
        />
      </div>

      {/* BIỂU ĐỒ DOANH THU 7 NGÀY & DANH SÁCH CẢNH BÁO CHƯA XỬ LÝ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-gray-900">
                Doanh Thu 7 Ngày Gần Nhất
              </h2>
              <p className="text-xs text-gray-500">
                Nguồn: GET /api/v1/analytics/revenue-chart?range=7
              </p>
            </div>
          </div>

          {!data?.revenueChart.length ? (
            <div className="h-72 flex items-center justify-center bg-gray-50 rounded-xl border border-dashed border-gray-200 text-sm text-gray-500">
              Chưa có dữ liệu doanh thu trong 7 ngày qua.
            </div>
          ) : (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data.revenueChart}
                  margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} />
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
                  <Bar dataKey="revenue" fill="#2563EB" radius={[6, 6, 0, 0]} maxBarSize={42} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* CẢNH BÁO ĐANG MỞ + SỨC KHỎE CHUỖI LẠNH */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-1.5">
                <Thermometer className="w-4 h-4 text-red-500" />
                Cảnh báo đang mở ({unresolvedAlerts.length})
              </h2>
              <button
                onClick={() =>
                  navigate(`/admin/machines/${data?.machines?.[0]?.id ?? 1}/coldchain`)
                }
                className="text-xs font-semibold text-blue-600 hover:text-blue-800"
              >
                Mở giám sát →
              </button>
            </div>

            {unresolvedAlerts.length === 0 ? (
              <div className="p-6 text-center text-sm text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                Không có cảnh báo chưa xử lý.
              </div>
            ) : (
              <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                {unresolvedAlerts.slice(0, 5).map((alert) => (
                  <button
                    key={alert.id}
                    type="button"
                    onClick={() => navigate(`/admin/machines/${alert.machineId}/coldchain`)}
                    className="w-full text-left p-3 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span
                        className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                          alert.severity === 'CRITICAL'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {alert.severity}
                      </span>
                      <span className="text-[11px] text-gray-400">
                        Máy #{alert.machineId} • {alert.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-800 line-clamp-2">{alert.message}</p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {data?.coldChainHealth && (
            <div className="mt-4 pt-3 border-t border-gray-100 text-xs text-gray-600 flex items-center justify-between">
              <span className="inline-flex items-center gap-1">
                <Activity className="w-3.5 h-3.5 text-emerald-600" />
                MTTR trung bình:
              </span>
              <strong>{data.coldChainHealth.systemMttrMinutes.toFixed(1)} phút</strong>
            </div>
          )}
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
      onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''
    }`}
  >
    <div className="min-w-0">
      <p className="text-xs font-semibold text-gray-500 mb-1">{title}</p>
      <p className={`text-2xl font-black truncate ${color}`}>{value}</p>
      <p className="text-[11px] text-gray-400 mt-1 line-clamp-2">{subText}</p>
    </div>
    <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center shrink-0 ${color}`}>
      {icon}
    </div>
  </div>
);