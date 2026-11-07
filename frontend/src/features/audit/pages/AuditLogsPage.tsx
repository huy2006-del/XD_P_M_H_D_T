import React, { useEffect, useState, useCallback } from 'react';
import {
  ShieldCheck, Search, Calendar, Filter, RefreshCw, Eye,
  LogIn, PackagePlus, CheckCircle2, Sliders, Activity
} from 'lucide-react';
import { auditService } from '../auditService';
import { AuditDetailModal } from '../components/AuditDetailModal';
import { TableSkeleton } from '../../../shared/components/ui/Skeleton';
import type { AuditLogItem, AuditFilterParams, AuditActionType } from '../types';

export const AuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);

  const [filters, setFilters] = useState<AuditFilterParams>({
    username: '',
    action: '',
    startDate: '',
    endDate: '',
  });

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      const data = await auditService.getAuditLogs(filters);
      setLogs(data);
    } catch (err) {
      console.error('Lỗi khi tải Audit Logs:', err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleResetFilter = () => {
    setFilters({ username: '', action: '', startDate: '', endDate: '' });
  };

  // Badge màu trực quan cho từng hành vi
  const renderActionBadge = (action: AuditActionType) => {
    switch (action) {
      case 'RESTOCK_COMPLETED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700">
            <PackagePlus className="w-3.5 h-3.5" /> Nạp Hàng (Restock)
          </span>
        );
      case 'ALERT_RESOLVED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">
            <CheckCircle2 className="w-3.5 h-3.5" /> Xử Lý Sự Cố
          </span>
        );
      case 'THRESHOLD_UPDATED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700">
            <Sliders className="w-3.5 h-3.5" /> Cấu Hình Nhiệt Độ
          </span>
        );
      case 'USER_LOGIN':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
            <LogIn className="w-3.5 h-3.5" /> Đăng Nhập
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-700">
            <Activity className="w-3.5 h-3.5" /> {action}
          </span>
        );
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto text-gray-800">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">Nhật Ký Thao Tác Hệ Thống</h1>
            <span className="px-2.5 py-0.5 bg-blue-100 text-blue-700 text-xs font-bold rounded-full flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> Audit Trail
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Tra cứu lịch sử thao tác: Ai đã làm gì, vào thời điểm nào (hỗ trợ lọc theo User và thời gian).
          </p>
        </div>

        <button
          onClick={fetchLogs}
          disabled={loading}
          className="flex items-center justify-center gap-2 border border-gray-200 bg-white hover:bg-gray-50 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Làm mới
        </button>
      </div>

      {/* Thanh lọc dữ liệu */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-center">
        {/* Lọc theo User */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            name="username"
            placeholder="Lọc theo Username..."
            value={filters.username}
            onChange={handleFilterChange}
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Lọc theo Loại hành động */}
        <div className="relative">
          <Filter className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <select
            name="action"
            value={filters.action}
            onChange={handleFilterChange}
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="">Tất cả hành động</option>
            <option value="RESTOCK_COMPLETED">Nạp Hàng (Restock)</option>
            <option value="ALERT_RESOLVED">Xử Lý Sự Cố</option>
            <option value="THRESHOLD_UPDATED">Cấu Hình Nhiệt Độ</option>
            <option value="USER_LOGIN">Đăng Nhập</option>
          </select>
        </div>

        {/* Từ ngày */}
        <div className="relative">
          <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="date"
            name="startDate"
            value={filters.startDate}
            onChange={handleFilterChange}
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Đến ngày */}
        <div className="relative">
          <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="date"
            name="endDate"
            value={filters.endDate}
            onChange={handleFilterChange}
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Nút đặt lại */}
        <button
          onClick={handleResetFilter}
          className="px-4 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors font-medium"
        >
          Đặt lại bộ lọc
        </button>
      </div>

      {/* Bảng Audit Log */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse whitespace-nowrap text-sm">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-100 text-gray-500">
                <th className="p-4 font-semibold">Thời Điểm</th>
                <th className="p-4 font-semibold">Người Thực Hiện</th>
                <th className="p-4 font-semibold">Hành Động</th>
                <th className="p-4 font-semibold">Chi Tiết Tóm Tắt</th>
                <th className="p-4 font-semibold text-center">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <TableSkeleton rows={5} cols={5} />
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-500">
                    Không tìm thấy sự kiện kiểm toán nào phù hợp.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="p-4 text-gray-600 font-mono text-xs">
                      {new Date(log.createdAt).toLocaleString('vi-VN')}
                    </td>
                    <td className="p-4 font-semibold text-gray-900">
                      {log.username}
                      {log.userId && <span className="text-gray-400 text-xs font-normal ml-1">#{log.userId}</span>}
                    </td>
                    <td className="p-4">{renderActionBadge(log.action)}</td>
                    <td className="p-4 text-gray-600 max-w-xs truncate font-mono text-xs" title={log.details || ''}>
                      {log.details || '—'}
                    </td>
                    <td className="p-4 text-center">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" /> Xem
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal chi tiết Payload */}
      <AuditDetailModal log={selectedLog} onClose={() => setSelectedLog(null)} />
    </div>
  );
};
