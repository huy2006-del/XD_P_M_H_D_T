import React, { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import { AlertCircle, CheckCircle2, AlertTriangle, Layers, Filter } from 'lucide-react';
import axiosInstance from '../../../shared/api/axiosInstance';
import type { MachineSlot } from '../types';

interface Props {
  machineId: number;
  onSlotSelected: (slot: MachineSlot) => void;
}

export const StepSelectSlot: React.FC<Props> = ({ machineId, onSlotSelected }) => {
  const [slots, setSlots] = useState<MachineSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'need_restock' | 'low_stock'>('all');

  useEffect(() => {
    let active = true;

    axiosInstance
      .get<MachineSlot[]>(`/api/v1/machines/${machineId}/slots`)
      .then(({ data }) => {
        if (active) setSlots(Array.isArray(data) ? data : []);
      })
      .catch((requestError: unknown) => {
        if (active) {
          setError(
            axios.isAxiosError<{ message?: string }>(requestError)
              ? requestError.response?.data?.message ?? requestError.message
              : 'Không thể tải sơ đồ khay.'
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [machineId]);

  const filteredSlots = useMemo(() => {
    return slots.filter((slot) => {
      const isFull = slot.currentStock >= slot.capacity;
      const isUnconfigured = slot.productId === null;
      const isJammed = slot.status === 'JAMMED';
      const percent = slot.capacity > 0 ? (slot.currentStock / slot.capacity) * 100 : 0;

      if (filterMode === 'need_restock') {
        return !isFull && !isUnconfigured && !isJammed;
      }
      if (filterMode === 'low_stock') {
        return !isUnconfigured && !isJammed && percent <= 30;
      }
      return true;
    });
  }, [slots, filterMode]);

  // Nhóm khay theo tầng (chữ cái đầu của slotCode ví dụ A1, A2 -> Tầng A)
  const groupedSlots = useMemo(() => {
    const groups: Record<string, MachineSlot[]> = {};
    for (const slot of filteredSlots) {
      const floor = slot.slotCode.trim().charAt(0).toUpperCase() || 'Khác';
      if (!groups[floor]) groups[floor] = [];
      groups[floor].push(slot);
    }
    return groups;
  }, [filteredSlots]);

  if (loading) {
    return (
      <div className="p-12 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent mb-3" />
        <p className="text-gray-500 text-sm">Đang tải sơ đồ khay máy #{machineId}...</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Bước 2: Chọn khay cần nạp hàng</h2>
          <p className="text-sm text-gray-500">
            Xem sức chứa, tồn kho hiện tại và chọn khay muốn thêm trái cây vào.
          </p>
        </div>

        {/* Bộ lọc nhanh cho Operator */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setFilterMode('all')}
              className={`px-3 py-1 rounded-md transition-all ${
                filterMode === 'all' ? 'bg-white shadow-xs text-blue-600' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Tất cả ({slots.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('low_stock')}
              className={`px-3 py-1 rounded-md transition-all ${
                filterMode === 'low_stock' ? 'bg-white shadow-xs text-amber-600 font-bold' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Sắp hết hàng
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('need_restock')}
              className={`px-3 py-1 rounded-md transition-all ${
                filterMode === 'need_restock' ? 'bg-white shadow-xs text-emerald-600' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Còn chỗ nạp
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div role="alert" className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
          {error}
        </div>
      )}

      {/* Hiển thị khay theo từng tầng */}
      <div className="space-y-6">
        {Object.entries(groupedSlots)
          .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
          .map(([floor, floorSlots]) => (
            <div key={floor} className="bg-gray-50/60 p-4 rounded-xl border border-gray-200/80">
              <div className="flex items-center gap-2 mb-3">
                <Layers className="w-4 h-4 text-gray-500" />
                <h3 className="text-sm font-bold text-gray-700 uppercase">Tầng {floor}</h3>
                <span className="text-xs text-gray-400">({floorSlots.length} khay)</span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {floorSlots.map((slot) => {
                  const isFull = slot.currentStock >= slot.capacity;
                  const isUnconfigured = slot.productId === null;
                  const isJammed = slot.status === 'JAMMED';
                  const isUnavailable = isFull || isUnconfigured || isJammed;
                  const percent =
                    slot.capacity > 0 ? Math.min(100, Math.round((slot.currentStock / slot.capacity) * 100)) : 0;
                  const isLowStock = !isUnavailable && percent <= 30;

                  return (
                    <button
                      type="button"
                      key={slot.slotId}
                      disabled={isUnavailable}
                      onClick={() => onSlotSelected(slot)}
                      className={`relative rounded-xl border p-3.5 text-left transition-all ${
                        isUnavailable
                          ? 'cursor-not-allowed bg-gray-100/70 border-gray-200 opacity-60'
                          : isLowStock
                            ? 'bg-amber-50/40 border-amber-300 hover:border-amber-500 shadow-xs hover:shadow-md cursor-pointer'
                            : 'bg-white border-gray-200 hover:border-blue-500 shadow-xs hover:shadow-md cursor-pointer'
                      }`}
                    >
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="font-mono font-bold text-base text-gray-900">{slot.slotCode}</span>
                        <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-md bg-gray-100 text-gray-700">
                          {slot.currentStock} / {slot.capacity}
                        </span>
                      </div>

                      <p className="truncate text-sm font-semibold text-gray-800" title={slot.productName || 'Chưa gán sản phẩm'}>
                        {slot.productName ?? <span className="text-gray-400 italic font-normal">Chưa gán SP</span>}
                      </p>

                      {/* Progress bar */}
                      <div className="mt-2.5">
                        <div className="h-1.5 w-full rounded-full bg-gray-200 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              isFull
                                ? 'bg-gray-400'
                                : percent <= 30
                                  ? 'bg-amber-500'
                                  : 'bg-emerald-500'
                            }`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>

                      {/* Trạng thái chi tiết */}
                      <div className="mt-2.5 flex items-center justify-between text-xs">
                        {isJammed ? (
                          <span className="inline-flex items-center gap-1 font-bold text-red-600">
                            <AlertCircle className="w-3.5 h-3.5" /> Khay bị kẹt
                          </span>
                        ) : isFull ? (
                          <span className="text-gray-500 font-medium">Đã đầy sức chứa</span>
                        ) : isUnconfigured ? (
                          <span className="text-amber-600 font-medium">Cần cấu hình SP</span>
                        ) : isLowStock ? (
                          <span className="inline-flex items-center gap-1 font-bold text-amber-700">
                            <AlertTriangle className="w-3.5 h-3.5" /> Cần nạp gấp!
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Có thể thêm {slot.capacity - slot.currentStock}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
      </div>

      {!error && slots.length === 0 && (
        <p className="py-12 text-center text-gray-500 text-sm">Máy chưa được thiết lập khay hàng nào.</p>
      )}
    </div>
  );
};
