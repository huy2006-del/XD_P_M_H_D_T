import React from 'react';
import {
  MapPin,
  Edit,
  Thermometer,
  Droplets,
  DoorClosed,
  Activity,
  AlertTriangle,
} from 'lucide-react';
import StatusBadge from './StatusBadge';

function renderFreshnessPill(freshness) {
  if (freshness === 'LOADING') {
    return (
      <span className="text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-600">
        Đang tải...
      </span>
    );
  }
  if (freshness === 'EMPTY') {
    return (
      <span className="text-[11px] px-2 py-0.5 rounded bg-gray-100 text-gray-600">
        Chưa có dữ liệu
      </span>
    );
  }
  if (freshness === 'STALE') {
    return (
      <span className="text-[11px] px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-medium">
        Dữ liệu cũ
      </span>
    );
  }
  return (
    <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 font-medium">
      Mới cập nhật
    </span>
  );
}

export const MachineTable = ({ machines, handleOpenModal, onOpenMonitor }) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Máy / Vị trí
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Nhiệt độ / Độ ẩm
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Cửa tủ
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Kết nối &amp; Cảnh báo
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Nhận gần nhất
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                Hành động
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {machines.map((machine) => (
              <tr key={machine.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3.5">
                  <div className="text-sm font-semibold text-gray-900">{machine.name}</div>
                  <div className="text-xs font-mono text-blue-600">{machine.serial}</div>
                  <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                    <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <span>{machine.location}</span>
                  </div>
                </td>

                <td className="px-4 py-3.5 whitespace-nowrap text-sm">
                  {machine.telemetryFreshness === 'LOADING' ? (
                    <span className="text-xs text-gray-400">Đang tải telemetry...</span>
                  ) : machine.currentTemp === null && machine.currentHumidity === null ? (
                    <span className="text-xs text-gray-400">Chưa có dữ liệu</span>
                  ) : (
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 font-mono font-semibold text-gray-900">
                        <Thermometer className="w-4 h-4 text-blue-500" />
                        {machine.currentTemp !== null
                          ? `${Number(machine.currentTemp).toFixed(1)}°C`
                          : '--'}
                        <span className="text-[11px] font-normal text-gray-400">
                          ({machine.tempMinThreshold}–{machine.tempMaxThreshold}°C)
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 font-mono text-xs text-cyan-700">
                        <Droplets className="w-3.5 h-3.5 text-cyan-500" />
                        {machine.currentHumidity !== null
                          ? `${Number(machine.currentHumidity).toFixed(0)}%`
                          : 'Chưa có độ ẩm'}
                      </div>
                    </div>
                  )}
                </td>

                <td className="px-4 py-3.5 whitespace-nowrap text-xs text-gray-600">
                  <div className="inline-flex items-center gap-1.5">
                    <DoorClosed className="w-4 h-4 text-gray-400" />
                    <span>{machine.doorLabel}</span>
                  </div>
                </td>

                <td className="px-4 py-3.5 whitespace-nowrap">
                  <div className="flex flex-col items-start gap-1.5">
                    <StatusBadge status={machine.status} />
                    {machine.unresolvedAlertsCount > 0 && (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
                        <AlertTriangle className="w-3 h-3" />
                        {machine.unresolvedAlertsCount} cảnh báo
                      </span>
                    )}
                  </div>
                </td>

                <td className="px-4 py-3.5 whitespace-nowrap text-xs text-gray-600">
                  <div className="mb-1">{machine.lastSeen}</div>
                  {renderFreshnessPill(machine.telemetryFreshness)}
                </td>

                <td className="px-4 py-3.5 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => onOpenMonitor(machine)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100"
                    >
                      <Activity className="w-3.5 h-3.5" /> Giám sát
                    </button>
                    <button
                      onClick={() => handleOpenModal(machine)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-100 border border-gray-200"
                    >
                      <Edit className="w-3.5 h-3.5" /> Chi tiết
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default MachineTable;