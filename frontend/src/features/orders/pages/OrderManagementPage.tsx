import React, { useEffect, useState } from 'react';
import { Filter, Calendar, Monitor, RefreshCw } from 'lucide-react';
import type { Order, OrderFilterParams } from '../orderService';
import { orderService } from '../orderService';
import { TableSkeleton } from '../../../shared/components/ui/Skeleton'; // Import Skeleton

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
};

const formatDateTime = (isoString: string) => {
  return new Date(isoString).toLocaleString('vi-VN', {
    hour: '2-digit', minute: '2-digit',
    day: '2-digit', month: '2-digit', year: 'numeric'
  });
};

export const OrderManagementPage: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true); // Mặc định true để hiện skeleton ngay
  const [filters, setFilters] = useState<OrderFilterParams>({
    date: '', machineId: '', status: '',
  });

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const cleanFilters = Object.fromEntries(
        Object.entries(filters).filter(([_, v]) => v !== '')
      );
      const data = await orderService.getOrders(cleanFilters);
      setOrders(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Lỗi tải đơn hàng:', error);
      // Không cần alert tay nữa vì đã có Axios Interceptor lo phần Toast
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [filters]);

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const renderStatusBadge = (status: Order['status']) => {
    switch (status) {
      case 'SUCCESS':
        return <span className="px-2.5 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full">🟢 THÀNH CÔNG</span>;
      case 'PENDING_PAYMENT':
        return <span className="px-2.5 py-1 bg-yellow-100 text-yellow-700 text-xs font-bold rounded-full">🟡 CHỜ THANH TOÁN</span>;
      case 'REFUNDED_JAMMED':
        return <span className="px-2.5 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full">🔴 ĐÃ HOÀN TIỀN</span>;
      default:
        return <span className="px-2.5 py-1 bg-gray-100 text-gray-700 text-xs font-bold rounded-full">{status}</span>;
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto text-gray-800">
      {/* Tiêu đề & Nút bấm Responsive */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">Quản lý Đơn hàng</h1>
          <p className="text-sm text-gray-500 mt-1">Giám sát các giao dịch thời gian thực</p>
        </div>
        <button
          onClick={fetchOrders}
          disabled={loading}
          className="w-full sm:w-auto flex items-center justify-center gap-2 border border-gray-200 bg-white hover:bg-gray-50 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Làm mới
        </button>
      </div>

      {/* Bộ lọc Responsive (Grid trên mobile) */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6 grid grid-cols-1 md:flex md:flex-wrap gap-4 items-center">
        <div className="hidden md:flex items-center gap-2 text-gray-500 font-medium text-sm">
          <Filter className="w-4 h-4" /> Lọc:
        </div>
        
        <div className="relative w-full md:w-auto">
          <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="date"
            name="date"
            value={filters.date}
            onChange={handleFilterChange}
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="relative w-full md:w-auto">
          <Monitor className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            name="machineId"
            placeholder="Tìm theo mã máy..."
            value={filters.machineId}
            onChange={handleFilterChange}
            className="w-full md:w-48 pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <select
          name="status"
          value={filters.status}
          onChange={handleFilterChange}
          className="w-full md:w-auto px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Tất cả trạng thái</option>
          <option value="SUCCESS">Thành công</option>
          <option value="PENDING_PAYMENT">Chờ thanh toán</option>
          <option value="REFUNDED_JAMMED">Hoàn tiền</option>
        </select>
      </div>

      {/* Bảng dữ liệu có Scroll ngang trên Mobile */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-sm text-gray-500">
                <th className="p-4 font-semibold">Mã đơn</th>
                <th className="p-4 font-semibold">Thời gian</th>
                <th className="p-4 font-semibold">Máy bán</th>
                <th className="p-4 font-semibold">Trái cây</th>
                <th className="p-4 font-semibold">Số tiền</th>
                <th className="p-4 font-semibold">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <TableSkeleton rows={5} cols={6} />
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-500">Không tìm thấy đơn hàng nào.</td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50/50 transition-colors text-sm">
                    <td className="p-4 font-medium text-blue-600">{order.orderCode}</td>
                    <td className="p-4 text-gray-600">{formatDateTime(order.createdAt)}</td>
                    <td className="p-4 text-gray-900 font-medium">{order.machineName} <span className="text-gray-400 text-xs">(#{order.machineId})</span></td>
                    <td className="p-4 text-gray-700 max-w-[200px] truncate" title={order.productName}>{order.productName}</td>
                    <td className="p-4 font-semibold text-gray-900">{formatCurrency(order.amount)}</td>
                    <td className="p-4">{renderStatusBadge(order.status)}</td>
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