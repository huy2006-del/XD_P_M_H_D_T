import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  RefreshCw,
  Wifi,
  WifiOff,
} from 'lucide-react';
import type { WebSocketConnectionStatus } from '../../../shared/realtime/useWebSocketSubscription';
import type { AlertItem, AlertSeverity, AlertStatus } from '../../alerts/alertService';

interface Props {
  alerts: AlertItem[];
  loading: boolean;
  selectedMachineId: number;
  machineNameMap: Record<number, string>;
  wsStatus: WebSocketConnectionStatus;
  onReconnectWs: () => void;
  onRefresh: () => void;
  onAcknowledge: (alertId: number) => Promise<void>;
  onOpenResolve: (alert: AlertItem) => void;
}

export const MachineAlertsPanel: React.FC<Props> = ({
  alerts,
  loading,
  selectedMachineId,
  machineNameMap,
  wsStatus,
  onReconnectWs,
  onRefresh,
  onAcknowledge,
  onOpenResolve,
}) => {
  const [scope, setScope] = useState<'CURRENT_MACHINE' | 'ALL'>('CURRENT_MACHINE');
  const [severityFilter, setSeverityFilter] = useState<'ALL' | AlertSeverity>('ALL');
  const [statusFilter, setStatusFilter] = useState<'UNRESOLVED' | 'ALL' | AlertStatus>('UNRESOLVED');
  const [busyId, setBusyId] = useState<number | null>(null);

  const unresolvedTotal = useMemo(
    () => alerts.filter((a) => a.status !== 'RESOLVED').length,
    [alerts]
  );

  const unresolvedForMachine = useMemo(
    () =>
      alerts.filter(
        (a) => a.machineId === selectedMachineId && a.status !== 'RESOLVED'
      ).length,
    [alerts, selectedMachineId]
  );

  const filteredAlerts = useMemo(() => {
    return alerts.filter((alert) => {
      if (scope === 'CURRENT_MACHINE' && alert.machineId !== selectedMachineId) {
        return false;
      }
      if (severityFilter !== 'ALL' && alert.severity !== severityFilter) {
        return false;
      }
      if (statusFilter === 'UNRESOLVED' && alert.status === 'RESOLVED') {
        return false;
      }
      if (
        statusFilter !== 'ALL' &&
        statusFilter !== 'UNRESOLVED' &&
        alert.status !== statusFilter
      ) {
        return false;
      }
      return true;
    });
  }, [alerts, scope, selectedMachineId, severityFilter, statusFilter]);

  const handleAck = async (id: number) => {
    try {
      setBusyId(id);
      await onAcknowledge(id);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              Danh sách cảnh báo chuỗi lạnh
            </h3>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700">
              Máy này chưa xử lý: {unresolvedForMachine}
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">
              Toàn hệ thống chưa xử lý: {unresolvedTotal}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
            {wsStatus === 'CONNECTED' ? (
              <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                <Wifi className="w-3.5 h-3.5" /> Đang nhận realtime qua /topic/alerts
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-red-600 font-medium">
                <WifiOff className="w-3.5 h-3.5" /> Mất kết nối /topic/alerts ({wsStatus})
                <button
                  onClick={onReconnectWs}
                  className="ml-1 underline text-blue-600 hover:text-blue-800"
                >
                  Thử reconnect
                </button>
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={scope}
            onChange={(e) => setScope(e.target.value as 'CURRENT_MACHINE' | 'ALL')}
            className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg bg-white"
          >
            <option value="CURRENT_MACHINE">Chỉ máy #{selectedMachineId}</option>
            <option value="ALL">Tất cả máy</option>
          </select>

          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value as 'ALL' | AlertSeverity)}
            className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg bg-white"
          >
            <option value="ALL">Mọi mức độ</option>
            <option value="CRITICAL">CRITICAL</option>
            <option value="WARNING">WARNING</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as 'UNRESOLVED' | 'ALL' | AlertStatus)
            }
            className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg bg-white"
          >
            <option value="UNRESOLVED">Chưa xử lý (ACTIVE + ACK)</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="ACKNOWLEDGED">ACKNOWLEDGED</option>
            <option value="RESOLVED">RESOLVED</option>
            <option value="ALL">Tất cả trạng thái</option>
          </select>

          <button
            onClick={onRefresh}
            disabled={loading}
            className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600"
            title="Làm mới cảnh báo"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-6 text-center text-sm text-gray-500 bg-gray-50 rounded-xl">
          Đang tải danh sách cảnh báo...
        </div>
      ) : filteredAlerts.length === 0 ? (
        <div className="p-6 text-center text-sm text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-200">
          Không có cảnh báo nào khớp bộ lọc hiện tại.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
              <tr>
                <th className="px-4 py-2.5 text-left">ID / Máy</th>
                <th className="px-4 py-2.5 text-left">Mức độ</th>
                <th className="px-4 py-2.5 text-left">Trạng thái</th>
                <th className="px-4 py-2.5 text-left">Nội dung &amp; Ghi chú</th>
                <th className="px-4 py-2.5 text-left">Thời gian</th>
                <th className="px-4 py-2.5 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredAlerts.map((alert) => (
                <tr key={alert.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="font-semibold text-gray-900">#{alert.id}</div>
                    <div className="text-xs text-gray-500">
                      {machineNameMap[alert.machineId] || `Máy #${alert.machineId}`}
                    </div>
                  </td>

                  <td className="px-4 py-3 whitespace-nowrap">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                        alert.severity === 'CRITICAL'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {alert.severity}
                    </span>
                    <div className="text-[11px] text-gray-400 mt-0.5">{alert.alertType}</div>
                  </td>

                  <td className="px-4 py-3 whitespace-nowrap">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                        alert.status === 'ACTIVE'
                          ? 'bg-rose-100 text-rose-700'
                          : alert.status === 'ACKNOWLEDGED'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-emerald-100 text-emerald-700'
                      }`}
                    >
                      {alert.status}
                    </span>
                  </td>

                  <td className="px-4 py-3 max-w-md">
                    <p className="text-gray-800">{alert.message}</p>
                    {alert.resolutionNote && (
                      <p className="text-xs text-emerald-700 mt-1">
                        Khắc phục ({alert.resolvedBy || 'Admin'}): {alert.resolutionNote}
                      </p>
                    )}
                  </td>

                  <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500">
                    <div>Phát sinh: {new Date(alert.createdAt).toLocaleString('vi-VN')}</div>
                    {alert.resolvedAt && (
                      <div className="text-emerald-700">
                        Đóng: {new Date(alert.resolvedAt).toLocaleString('vi-VN')}
                      </div>
                    )}
                  </td>

                  <td className="px-4 py-3 whitespace-nowrap text-right">
                    {alert.status === 'RESOLVED' ? (
                      <span className="text-xs text-gray-400 font-medium">Đã đóng</span>
                    ) : (
                      <div className="flex items-center justify-end gap-2">
                        {alert.status === 'ACTIVE' && (
                          <button
                            onClick={() => void handleAck(alert.id)}
                            disabled={busyId === alert.id}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200 disabled:opacity-50"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            {busyId === alert.id ? '...' : 'Tiếp nhận'}
                          </button>
                        )}
                        <button
                          onClick={() => onOpenResolve(alert)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Xử lý &amp; Đóng
                        </button>
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
  );
};