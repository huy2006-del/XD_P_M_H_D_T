import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Search, Monitor, MapPin, Hash, CheckCircle } from 'lucide-react';
import axiosInstance from '../../../shared/api/axiosInstance';
import type { Machine, MachineSlot } from '../types';

interface Props {
  onSelect: (machine: Machine) => void;
}

export const StepSelectMachine: React.FC<Props> = ({ onSelect }) => {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [stockPercentByMachine, setStockPercentByMachine] = useState<Record<number, number | null>>({});

  useEffect(() => {
    let active = true;

    axiosInstance
      .get<Machine[]>('/api/v1/machines')
      .then(({ data }) => {
        if (!active) return;
        const machineList = Array.isArray(data) ? data : [];
        setMachines(machineList);
        void Promise.all(
          machineList.map(async (machine) => {
            try {
              const response = await axiosInstance.get<MachineSlot[]>(
                `/api/v1/machines/${machine.id}/slots`
              );
              const slots = Array.isArray(response.data) ? response.data : [];
              const capacity = slots.reduce((sum, slot) => sum + Math.max(0, slot.capacity), 0);
              const stock = slots.reduce((sum, slot) => sum + Math.max(0, slot.currentStock), 0);
              return [machine.id, capacity > 0 ? Math.round((stock / capacity) * 100) : null] as const;
            } catch {
              return [machine.id, null] as const;
            }
          })
        ).then((results) => {
          if (active) setStockPercentByMachine(Object.fromEntries(results));
        });
      })
      .catch((requestError: unknown) => {
        if (active) {
          setError(
            axios.isAxiosError<{ message?: string }>(requestError)
              ? requestError.response?.data?.message ?? requestError.message
              : 'Không thể tải danh sách máy.'
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const filteredMachines = machines.filter((m) => {
    const q = searchTerm.toLowerCase();
    return (
      (m.name && m.name.toLowerCase().includes(q)) ||
      (m.serialNumber && m.serialNumber.toLowerCase().includes(q)) ||
      (m.locationName && m.locationName.toLowerCase().includes(q))
    );
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ONLINE':
        return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">ONLINE</span>;
      case 'MAINTENANCE':
        return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">BẢO TRÌ</span>;
      case 'OFFLINE':
        return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-700">OFFLINE</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800">{status}</span>;
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent mb-3" />
        <p className="text-gray-500 text-sm">Đang tải danh sách máy bán hàng...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Bước 1: Chọn máy cần tiếp hàng</h2>
          <p className="text-sm text-gray-500">
            Chọn máy bán hàng tự động bạn đang trực tiếp đứng nạp hàng.
          </p>
        </div>

        {/* Tìm kiếm */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm theo tên máy, vị trí..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {error && (
        <div role="alert" className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredMachines.map((m) => {
          const stockPercent = stockPercentByMachine[m.id];
          const isLowStock = stockPercent != null && stockPercent < 20;
          return (
          <button
            type="button"
            key={m.id}
            onClick={() => onSelect(m)}
            className={`w-full rounded-xl border p-4 text-left cursor-pointer transition-all shadow-xs hover:shadow-md bg-white group ${isLowStock ? 'border-red-300 bg-red-50/40 hover:border-red-400' : 'border-gray-200 hover:border-blue-400'}`}
          >
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center gap-2">
                <Monitor className="w-5 h-5 text-blue-600 group-hover:scale-110 transition-transform" />
                <h3 className="font-bold text-base text-gray-900 group-hover:text-blue-600 transition-colors">
                  {m.name}
                </h3>
              </div>
              {getStatusBadge(m.status)}
            </div>

            <div className="space-y-1 text-xs text-gray-500 mt-2">
              <div className="flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5 text-gray-400" />
                <span>Số sê-ri: <strong className="font-mono text-gray-700">{m.serialNumber}</strong></span>
              </div>
              <div className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-gray-400" />
                <span>Vị trí: <strong className="text-gray-700">{m.locationName || 'Chưa gán'}</strong></span>
              </div>
            </div>

            {stockPercent != null && (
              <div className="mt-3 flex items-center justify-between text-xs">
                <span className="text-gray-500">Tồn theo sức chứa</span>
                <strong className={isLowStock ? 'text-red-700' : 'text-gray-700'}>
                  {stockPercent}%
                  {isLowStock && ' · Cần tiếp hàng'}
                </strong>
              </div>
            )}

            <div className="mt-3 pt-2 border-t border-gray-100 flex items-center justify-between text-xs text-blue-600 font-semibold">
              <span>Bấm để chọn máy này</span>
              <CheckCircle className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </button>
          );
        })}
      </div>

      {!error && filteredMachines.length === 0 && (
        <p className="py-12 text-center text-gray-500 text-sm">
          Không tìm thấy máy nào phù hợp với từ khóa tìm kiếm.
        </p>
      )}
    </div>
  );
};
