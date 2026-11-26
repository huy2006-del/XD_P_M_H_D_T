import React, { useEffect, useState, useCallback } from 'react';
import { Filter, Calendar, Monitor, RefreshCw, Search } from 'lucide-react';
import type { Order, OrderFilterParams, OrderMachineOption } from '../orderService';
import { orderService } from '../orderService';
import { TableSkeleton } from '../../../shared/components/ui/Skeleton';

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);

const formatDateTime = (isoString: string) =>
  new Date(isoString).toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

export const OrderManagementPage: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [machines, setMachines] = useState<OrderMachineOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filters, setFilters] = useState<OrderFilterParams>({
    date: '',
    machineId: '',
    status: '',
    keyword: '',
  });

  useEffect(() => {
    orderService
      .getMachines()
      .then(setMachines)
      .catch((error) => console.error('Không tải được danh sách máy cho bộ lọc:', error));
  }, []);

  const fetchOrders = useCallback(
    async (silent = false) => {
      try {
        if (silent) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }
        const cleanFilters = Object.fromEntries(
          Object.entries(filters).filter(([, v]) => v !== '' && v !== undefined)
        );
        const data = await orderService.getOrders(cleanFilters);
        setOrders(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Lỗi tải đơn hàng:', error);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [filters]
  );

  useEffect(() => {
    void fetchOrders(false);
  }, [fetchOrders]);

  useEffect(() => {
    const timer = window.setInterval(() => void fetchOrders(true), 10_000);
    return () => window.clearInterval(timer);
  }, [fetchOrders]);

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleResetFilters = () => {
    setFilters({ date: '', machineId: '', status: '', keyword: '' });
  };

  const renderStatusBadge = (status: Order['status'], voucherCode?: string | null) => {
    switch (status) {
      case 'SUCCESS':
        return (
          <span className="px-2.5 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full">
            🟢 THÀNH CÔNG
          </span>
        );
      case 'PENDING_PAYMENT':
        return (
          <span className="px-2.5 py-1 bg-yellow-100 text-yellow-700 text-xs font-bold rounded-full">
            🟡 CHỜ THANH TOÁN
          </span>
        );
      case 'REFUNDED_JAMMED':
        return (
          <div className="flex flex-col items-start gap-1">
            <span className="px-2.5 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full">
              🔴 KẸT HÀNG • ĐÃ HOÀN TIỀN
            </span>
            {voucherCode && (
              <span className="text-[11px] font-mono text-red-700 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                Voucher: {voucherCode}
              </span>
            )}
          </div>
        );
      case 'DISPENSING':
        return (
          <span className="px-2.5 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-full">
            🔵 ĐÃ THANH TOÁN • ĐANG NHẢ HÀNG
          </span>
        );
      case 'PAYMENT_FAILED':
        return (
          <span className="px-2.5 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full">
            🔴 THANH TOÁN THẤT BẠI
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 bg-gray-100 text-gray-700 text-xs font-bold rounded-full">
            {status}
          </span>
        );
    }
  };

  const hasActiveFilter = Boolean(
    filters.date || filters.machineId || filters.status || filters.keyword
  );

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto text-gray-800">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">Quản lý Đơn hàng</h1>
          <p className="text-sm text-gray-500 mt-1">
            Giám sát giao dịch thực tế (tự động đồng bộ mỗi 10 giây)
          </p>
        </div>
        <button
          onClick={() => void fetchOrders(true)}
          disabled={loading || refreshing}
          className="w-full sm:w-auto flex items-center justify-center gap-2 border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-60 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading || refreshing ? 'animate-spin' : ''}`} />
          Làm mới
        </button>
      </div>

      {/* Bộ lọc theo ngày, máy, trạng thái và từ khóa */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6 grid grid-cols-1 md:flex md:flex-wrap gap-3 items-center">
        <div className="hidden md:flex items-center gap-2 text-gray-500 font-medium text-sm">
          <Filter className="w-4 h-4" /> Lọc:
        </div>

        <div className="relative w-full md:w-auto">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            name="keyword"
            placeholder="Tìm mã đơn, trái cây, máy..."
            value={filters.keyword ?? ''}
            onChange={handleFilterChange}
            className="w-full md:w-56 pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="relative w-full md:w-auto">
          <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="date"
            name="date"
            value={filters.date ?? ''}
            onChange={handleFilterChange}
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="relative w-full md:w-auto">
          <Monitor className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <select
            name="machineId"
            value={filters.machineId ?? ''}
            onChange={handleFilterChange}
            className="w-full md:w-56 pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Tất cả máy bán hàng</option>
            {machines.map((m) => (
              <option key={m.id} value={String(m.id)}>
                {m.name} ({m.serialNumber})
              </option>
            ))}
          </select>
        </div>

        <select
          name="status"
          value={filters.status ?? ''}
          onChange={handleFilterChange}
          className="w-full md:w-auto px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Tất cả trạng thái</option>
          <option value="SUCCESS">Thành công</option>
          <option value="PENDING_PAYMENT">Chờ thanh toán</option>
          <option value="DISPENSING">Đã thanh toán, đang nhả hàng</option>
          <option value="REFUNDED_JAMMED">Kẹt hàng - Đã hoàn tiền</option>
          <option value="PAYMENT_FAILED">Thanh toán thất bại</option>
        </select>

        {hasActiveFilter && (
          <button
            type="button"
            onClick={handleResetFilters}
            className="px-3 py-2 text-xs font-semibold text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-lg"
          >
            Xóa bộ lọc
          </button>
        )}
      </div>

      {/* Bảng dữ liệu đơn hàng */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-sm text-gray-500">
                <th className="p-4 font-semibold">Mã đơn</th>
                <th className="p-4 font-semibold">Thời gian</th>
                <th className="p-4 font-semibold">Máy bán</th>
                <th className="p-4 font-semibold">Trái cây / Số lượng</th>
                <th className="p-4 font-semibold">Số tiền</th>
                <th className="p-4 font-semibold">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <TableSkeleton rows={5} cols={6} />
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-500">
                    Không tìm thấy đơn hàng nào khớp bộ lọc.
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50/50 transition-colors text-sm">
                    <td className="p-4 font-medium font-mono text-blue-600">{order.orderCode}</td>
                    <td className="p-4 text-gray-600">{formatDateTime(order.createdAt)}</td>
                    <td className="p-4">
                      <div className="text-gray-900 font-medium">{order.machineName}</div>
                      <div className="text-xs text-gray-400 font-mono">
                        {order.machineSerial ? `${order.machineSerial} • ` : ''}#{order.machineId}
                      </div>
                    </td>
                    <td
                      className="p-4 text-gray-700 max-w-[280px] truncate"
                      title={order.productName}
                    >
                      {order.productName}
                    </td>
                    <td className="p-4 font-semibold text-gray-900">
                      {formatCurrency(order.amount)}
                    </td>
                    <td className="p-4">
                      {renderStatusBadge(order.status, order.refundVoucherCode)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};