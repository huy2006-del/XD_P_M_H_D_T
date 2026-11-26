import React, { useEffect, useState, useCallback } from 'react';
import { CheckCircle2, RefreshCw, ShieldAlert, Check, Search } from 'lucide-react';
import { alertService, type AlertItem } from '../alertService';
import { ResolveAlertModal } from '../ResolveAlertModal';
import { toast } from 'sonner';

export const OperatorAlertsPage: React.FC = () => {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAlert, setSelectedAlert] = useState<AlertItem | null>(null);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'RESOLVED'>('ACTIVE');
  const [severityFilter, setSeverityFilter] = useState<'ALL' | 'CRITICAL' | 'WARNING'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    try {
      const data = await alertService.getAlerts();
      setAlerts(data);
    } catch (err) {
      console.error('Lỗi khi tải cảnh báo:', err);
      toast.error('Không thể tải danh sách cảnh báo.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  const handleAcknowledge = async (id: number) => {
    try {
      const updated = await alertService.acknowledgeAlert(id);
      setAlerts((prev) => prev.map((a) => (a.id === id ? updated : a)));
      toast.success(`Đã tiếp nhận cảnh báo #${id}`);
    } catch (err) {
      console.error('Lỗi tiếp nhận:', err);
      toast.error('Không thể tiếp nhận cảnh báo.');
    }
  };

  const handleResolveSuccess = (resolvedAlert: AlertItem) => {
    setAlerts((prev) => prev.map((a) => (a.id === resolvedAlert.id ? resolvedAlert : a)));
    toast.success(`Đã xử lý & đóng cảnh báo #${resolvedAlert.id}`);
  };

  const filteredAlerts = alerts.filter((a) => {
    const matchesStatus =
      statusFilter === 'ALL'
        ? true
        : statusFilter === 'ACTIVE'
          ? a.status === 'ACTIVE' || a.status === 'ACKNOWLEDGED'
          : a.status === 'RESOLVED';
    const matchesSeverity = severityFilter === 'ALL' || a.severity === severityFilter;
    const query = searchTerm.trim().toLowerCase();
    const matchesSearch =
      !query ||
      a.message.toLowerCase().includes(query) ||
      (a.machineName || `Máy #${a.machineId}`).toLowerCase().includes(query) ||
      String(a.id).includes(query);
    return matchesStatus && matchesSeverity && matchesSearch;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900">Trung Tâm Cảnh Báo Thiết Bị (Operator Alerts)</h1>
            <span className="px-2.5 py-0.5 bg-amber-100 text-amber-800 text-xs font-bold rounded-full flex items-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5" /> Khắc phục sự cố
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Tiếp nhận và đóng cảnh báo lỗi nhiệt độ, kẹt hàng, cửa mở của các máy bán hàng.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={fetchAlerts}
            disabled={loading}
            className="flex items-center gap-1.5 px-3.5 py-2 border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 rounded-lg text-sm font-medium transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-600' : ''}`} />
            <span>Làm mới</span>
          </button>
        </div>
      </div>

      {/* Filter tab & search */}
      <div className="flex flex-col md:flex-row justify-between gap-3 border-b border-gray-200 pb-3">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setStatusFilter('ACTIVE')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all cursor-pointer ${
              statusFilter === 'ACTIVE'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Cần xử lý ({alerts.filter((a) => a.status === 'ACTIVE' || a.status === 'ACKNOWLEDGED').length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('RESOLVED')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all cursor-pointer ${
              statusFilter === 'RESOLVED'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Đã xử lý xong ({alerts.filter((a) => a.status === 'RESOLVED').length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('ALL')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all cursor-pointer ${
              statusFilter === 'ALL'
                ? 'bg-gray-800 text-white shadow-xs'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Tất cả ({alerts.length})
          </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm máy hoặc nội dung..."
              className="w-full sm:w-56 pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value as 'ALL' | 'CRITICAL' | 'WARNING')}
            aria-label="Lọc theo mức độ"
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <option value="ALL">Mọi mức độ</option>
            <option value="CRITICAL">CRITICAL</option>
            <option value="WARNING">WARNING</option>
          </select>
        </div>
      </div>

      {/* Bảng danh sách cảnh báo */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-amber-500 border-t-transparent mb-3" />
            <p className="text-gray-500 text-sm">Đang tải danh sách cảnh báo...</p>
          </div>
        ) : filteredAlerts.length === 0 ? (
          <div className="p-12 text-center text-gray-500 text-sm">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
            <p className="font-bold text-gray-700">Tất cả các máy đều an toàn!</p>
            <p className="text-xs text-gray-400 mt-1">Không có sự cố nào chưa được xử lý.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left border-collapse text-sm">
              <thead className="bg-gray-50 border-b border-gray-200/80 text-gray-600 font-semibold text-xs uppercase">
                <tr>
                  <th className="p-4">Mã Sự Cố</th>
                  <th className="p-4">Máy</th>
                  <th className="p-4">Mức Độ</th>
                  <th className="p-4">Nội Dung Sự Cố</th>
                  <th className="p-4">Thời Gian</th>
                  <th className="p-4">Trạng Thái</th>
                  <th className="p-4 text-center">Hành Động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {filteredAlerts.map((a) => (
                  <tr key={a.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="p-4 font-mono font-bold text-gray-900">#{a.id}</td>
                    <td className="p-4 font-semibold text-blue-600">
                      {a.machineName || `Máy #${a.machineId}`}
                    </td>
                    <td className="p-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                          a.severity === 'CRITICAL'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {a.severity}
                      </span>
                    </td>
                    <td className="p-4 max-w-xs text-gray-800 font-medium">
                      {a.message}
                      {a.resolutionNote && (
                        <p className="text-xs text-gray-400 mt-1">
                          Khắc phục: <span className="italic">{a.resolutionNote}</span>
                        </p>
                      )}
                    </td>
                    <td className="p-4 font-mono text-xs text-gray-500 whitespace-nowrap">
                      {new Date(a.createdAt).toLocaleString('vi-VN')}
                    </td>
                    <td className="p-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                          a.status === 'RESOLVED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : a.status === 'ACKNOWLEDGED'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {a.status}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      {a.status !== 'RESOLVED' ? (
                        <div className="flex items-center justify-center gap-1.5">
                          {a.status === 'ACTIVE' && (
                            <button
                              type="button"
                              onClick={() => handleAcknowledge(a.id)}
                              className="px-2.5 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-md text-xs font-bold transition-colors cursor-pointer"
                              title="Tiếp nhận xử lý"
                            >
                              Tiếp nhận
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setSelectedAlert(a)}
                            className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-600 text-white hover:bg-emerald-700 rounded-md text-xs font-bold transition-colors cursor-pointer shadow-xs"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Khắc phục</span>
                          </button>
                        </div>
                      ) : (
                        <div className="text-xs text-gray-600 space-y-0.5 text-left inline-block">
                          <div className="font-semibold text-emerald-700">
                            Người xử lý: {a.resolvedBy || 'Operator'}
                          </div>
                          {a.resolvedAt && (
                            <div className="font-mono text-[11px] text-gray-400">
                              {new Date(a.resolvedAt).toLocaleString('vi-VN')}
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal xử lý cảnh báo */}
      <ResolveAlertModal
        alertItem={selectedAlert}
        onClose={() => setSelectedAlert(null)}
        onSuccess={handleResolveSuccess}
      />
    </div>
  );
};
