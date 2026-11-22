import React from 'react';
import {
  Cpu,
  MapPin,
  Activity,
  Thermometer,
  Droplets,
  DoorClosed,
  AlertTriangle,
} from 'lucide-react';
import StatusBadge from './StatusBadge';

export const MachineGrid = ({ machines, handleOpenModal, onOpenMonitor }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {machines.map((machine) => (
        <div
          key={machine.id}
          className={`bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col transition-all hover:shadow-md border-l-4 ${
            machine.status === 'ONLINE'
              ? 'border-l-green-500'
              : machine.status === 'OUT_OF_ORDER' || machine.status === 'ERROR'
              ? 'border-l-red-500'
              : machine.status === 'MAINTENANCE'
              ? 'border-l-yellow-500'
              : 'border-l-gray-400'
          }`}
        >
          <div className="p-5 flex-1">
            <div className="flex justify-between items-start mb-3">
              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                <Cpu className="w-5 h-5" />
              </div>
              <StatusBadge status={machine.status} />
            </div>

            <h4 className="text-base font-semibold text-gray-900 mb-0.5">{machine.name}</h4>
            <p className="text-xs text-gray-400 font-mono mb-3">SN: {machine.serial}</p>

            <div className="grid grid-cols-2 gap-2 mb-3 p-2.5 rounded-lg bg-gray-50 border border-gray-100 text-xs">
              <div>
                <span className="text-gray-400 flex items-center gap-1">
                  <Thermometer className="w-3.5 h-3.5 text-blue-500" /> Nhiệt độ
                </span>
                <span className="font-mono font-bold text-gray-900 text-sm">
                  {machine.telemetryFreshness === 'LOADING'
                    ? '...'
                    : machine.currentTemp !== null
                    ? `${Number(machine.currentTemp).toFixed(1)}°C`
                    : 'Trống'}
                </span>
              </div>
              <div>
                <span className="text-gray-400 flex items-center gap-1">
                  <Droplets className="w-3.5 h-3.5 text-cyan-500" /> Độ ẩm
                </span>
                <span className="font-mono font-bold text-cyan-700 text-sm">
                  {machine.telemetryFreshness === 'LOADING'
                    ? '...'
                    : machine.currentHumidity !== null
                    ? `${Number(machine.currentHumidity).toFixed(0)}%`
                    : 'Trống'}
                </span>
              </div>
            </div>

            <div className="space-y-1.5 text-xs text-gray-600">
              <div className="flex items-start gap-2">
                <MapPin className="w-3.5 h-3.5 text-gray-400 mt-0.5 shrink-0" />
                <span className="line-clamp-2">{machine.location}</span>
              </div>
              <div className="flex items-center gap-2">
                <DoorClosed className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                <span>Cửa: {machine.doorLabel}</span>
              </div>
              <div className="flex items-center gap-2">
                <Activity className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                <span>
                  {machine.lastSeen}
                  {machine.telemetryFreshness === 'STALE' ? ' (Dữ liệu cũ)' : ''}
                </span>
              </div>
              {machine.unresolvedAlertsCount > 0 && (
                <div className="inline-flex items-center gap-1 text-red-700 bg-red-50 px-2 py-0.5 rounded-full font-bold mt-1">
                  <AlertTriangle className="w-3 h-3" />
                  {machine.unresolvedAlertsCount} cảnh báo chưa xử lý
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-gray-100 bg-gray-50/50 p-3 grid grid-cols-2 gap-2">
            <button
              onClick={() => onOpenMonitor(machine)}
              className="py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            >
              Giám sát
            </button>
            <button
              onClick={() => handleOpenModal(machine)}
              className="py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-200 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Chi tiết / Sửa
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default MachineGrid;