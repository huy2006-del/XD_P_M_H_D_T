import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Trash2, Plus, AlertCircle, Info, Calendar } from 'lucide-react';
import axiosInstance from '../../../shared/api/axiosInstance';
import type { PaginatedResponse } from '../../../shared/types/common.types';
import type { AddItemRequest, FruitBatch, MachineSlot, RestockItem } from '../types';
import { formatDate, getDaysUntilExpiry } from '../../../shared/utils/dateUtils';

interface Props {
  selectedSlot: MachineSlot;
  sessionItems: RestockItem[];
  onAddItem: (data: AddItemRequest, slot: MachineSlot, batch: FruitBatch) => Promise<void>;
  onRemoveItem?: (slotId: number, batchId: number) => void;
}

export const StepRestockItems: React.FC<Props> = ({
  selectedSlot,
  sessionItems,
  onAddItem,
  onRemoveItem,
}) => {
  const [batches, setBatches] = useState<FruitBatch[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [errorMsg, setErrorMsg] = useState('');
  const [loadingBatches, setLoadingBatches] = useState(true);
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    let active = true;

    axiosInstance
      .get<PaginatedResponse<FruitBatch>>('/api/v1/batches', {
        params: {
          productId: selectedSlot.productId,
          expired: false,
          page: 0,
          size: 100,
        },
      })
      .then(({ data }) => {
        if (!active) return;
        const list = Array.isArray(data?.content) ? data.content : [];
        // Lọc nghiêm ngặt: không hết hạn, còn tồn kho, đúng sản phẩm khay
        const validBatches = list.filter((b) => {
          const isDateValid = getDaysUntilExpiry(b.expiryDate) > 0;
          return !b.expired && isDateValid && b.quantityRemaining > 0;
        });

        // Sắp xếp FEFO (First Expired, First Out)
        validBatches.sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());

        setBatches(validBatches);
        if (validBatches.length > 0) {
          setSelectedBatchId(String(validBatches[0].id));
        }
      })
      .catch((err: unknown) => {
        if (!active) return;
        const msg = axios.isAxiosError<{ message?: string }>(err)
          ? err.response?.data?.message ?? err.message
          : 'Không thể tải danh sách lô hàng phù hợp.';
        setErrorMsg(msg);
      })
      .finally(() => {
        if (active) setLoadingBatches(false);
      });

    return () => {
      active = false;
    };
  }, [selectedSlot.productId]);

  // Tính số lượng đã lên kế hoạch cho khay này
  const itemsForSlot = sessionItems.filter((i) => i.slotId === selectedSlot.slotId);
  const addedForSlot = itemsForSlot.reduce((sum, i) => sum + i.quantityAdded, 0);
  const slotRemainingSpace = Math.max(0, selectedSlot.capacity - selectedSlot.currentStock - addedForSlot);

  // Lô đang chọn
  const selectedBatch = useMemo(
    () => batches.find((b) => String(b.id) === selectedBatchId) ?? null,
    [batches, selectedBatchId]
  );

  // Tính số lượng của lô đang chọn đã được phân bổ trong phiên này (cho mọi khay)
  const pendingForBatch = sessionItems
    .filter((i) => i.batchId === selectedBatch?.id)
    .reduce((sum, i) => sum + i.quantityAdded, 0);

  const batchAvailable = Math.max(0, (selectedBatch?.quantityRemaining ?? 0) - pendingForBatch);
  const maxAllowed = Math.min(slotRemainingSpace, batchAvailable);

  const handleAdd = async () => {
    setErrorMsg('');

    if (!selectedBatch) {
      setErrorMsg('Vui lòng chọn một lô hàng còn hạn để nạp.');
      return;
    }

    if (!Number.isSafeInteger(quantity) || quantity <= 0) {
      setErrorMsg('Số lượng nạp phải là số nguyên dương lớn hơn 0.');
      return;
    }

    if (quantity > maxAllowed) {
      setErrorMsg(`Số lượng tối đa có thể thêm hiện tại là ${maxAllowed}.`);
      return;
    }

    try {
      setIsAdding(true);
      await onAddItem(
        {
          slotId: selectedSlot.slotId,
          batchId: selectedBatch.id,
          quantityAdded: quantity,
        },
        selectedSlot,
        selectedBatch
      );
      setQuantity(1);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Không thể thêm vào kế hoạch nạp.');
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header bước */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div>
          <h2 className="text-lg font-bold text-gray-900">
            Bước 3: Lập kế hoạch nạp khay <span className="font-mono text-blue-600">{selectedSlot.slotCode}</span>
          </h2>
          <p className="text-sm text-gray-500">
            Sản phẩm: <strong>{selectedSlot.productName || 'Chưa gán'}</strong> · Sức chứa còn trống:{' '}
            <strong className="text-emerald-700">{slotRemainingSpace} sản phẩm</strong>
          </p>
        </div>
      </div>

      {errorMsg && (
        <div role="alert" className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Box nhập lô */}
      <div className="p-5 bg-gray-50 rounded-xl border border-gray-200/80 space-y-4">
        {loadingBatches ? (
          <div className="py-4 text-center text-sm text-gray-500">Đang tìm kiếm các lô hàng hợp lệ trong kho...</div>
        ) : batches.length === 0 ? (
          <div className="p-4 bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-lg flex items-start gap-2">
            <Info className="w-5 h-5 shrink-0 text-amber-600 mt-0.5" />
            <div>
              <p className="font-bold">Không tìm thấy lô hàng khả dụng cho sản phẩm này!</p>
              <p className="text-xs text-amber-700 mt-1">
                Tất cả các lô của sản phẩm này đã hết hạn hoặc đã được xuất hết trong kho. Vui lòng vào trang Quản lý Lô Hàng để nhập lô mới trước khi tiếp hàng.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            {/* Dropdown chọn lô */}
            <div className="md:col-span-2 space-y-1">
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                Chọn Lô Hàng (Ưu tiên FEFO - Hạn gần nhất)
              </label>
              <select
                className="w-full border border-gray-300 rounded-lg p-2.5 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                value={selectedBatchId}
                onChange={(e) => {
                  setSelectedBatchId(e.target.value);
                  setQuantity(1);
                  setErrorMsg('');
                }}
              >
                {batches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.batchCode} · HSD: {formatDate(b.expiryDate)} · Tồn kho: {b.quantityRemaining} quả · {b.supplier || 'NCC'}
                  </option>
                ))}
              </select>
              {selectedBatch && (
                <div className="flex items-center gap-2 text-xs text-gray-500 pt-1">
                  <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                  <span>HSD: <strong>{formatDate(selectedBatch.expiryDate)}</strong></span>
                  <span>•</span>
                  <span>Khả dụng trong kho: <strong>{batchAvailable} quả</strong></span>
                </div>
              )}
            </div>

            {/* Số lượng */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                Số lượng nạp (Tối đa: {maxAllowed})
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min={1}
                  max={maxAllowed}
                  value={quantity}
                  disabled={maxAllowed <= 0}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-sm font-bold text-center focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:bg-gray-100"
                />
                <button
                  type="button"
                  onClick={handleAdd}
                  disabled={isAdding || maxAllowed <= 0}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold transition-all disabled:opacity-50 cursor-pointer whitespace-nowrap shadow-xs"
                >
                  <Plus className="w-4 h-4" />
                  {isAdding ? 'Đang thêm...' : 'Thêm'}
                </button>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                {[1, 5].map((amount) => (
                  <button
                    key={amount}
                    type="button"
                    disabled={isAdding || maxAllowed <= 0}
                    onClick={() => setQuantity((current) => Math.min(maxAllowed, Math.max(1, current) + amount))}
                    className="min-h-[38px] rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                  >
                    +{amount}
                  </button>
                ))}
                <button
                  type="button"
                  disabled={isAdding || maxAllowed <= 0}
                  onClick={() => setQuantity(maxAllowed)}
                  className="min-h-[38px] rounded-md border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-50"
                >
                  Đầy khay ({maxAllowed})
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Danh sách các mục đã lên kế hoạch trong phiên */}
      <div>
        <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-2">
          Kế hoạch tiếp hàng phiên này ({sessionItems.length} mục)
        </h3>

        {sessionItems.length === 0 ? (
          <div className="border border-dashed border-gray-200 rounded-xl p-8 text-center text-sm text-gray-400">
            Chưa có mục nào được thêm vào kế hoạch. Hãy chọn lô và số lượng ở trên rồi bấm &ldquo;Thêm&rdquo;.
          </div>
        ) : (
          <div className="overflow-x-auto bg-white rounded-xl border border-gray-200/80">
            <table className="min-w-full text-left border-collapse text-sm">
              <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-semibold text-xs uppercase">
                <tr>
                  <th className="p-3">Khay</th>
                  <th className="p-3">Sản Phẩm</th>
                  <th className="p-3">Mã Lô</th>
                  <th className="p-3 text-right">Số Lượng Nạp</th>
                  {onRemoveItem && <th className="p-3 text-center">Thao Tác</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {sessionItems.map((item) => (
                  <tr key={`${item.slotId}-${item.batchId}`} className="hover:bg-gray-50/60">
                    <td className="p-3 font-mono font-bold text-blue-600">{item.slotCode}</td>
                    <td className="p-3 font-medium text-gray-900">{item.productName}</td>
                    <td className="p-3 font-mono text-xs">{item.batchCode}</td>
                    <td className="p-3 text-right font-bold text-emerald-700">+{item.quantityAdded}</td>
                    {onRemoveItem && (
                      <td className="p-3 text-center">
                        <button
                          type="button"
                          onClick={() => onRemoveItem(item.slotId, item.batchId)}
                          className="text-red-500 hover:text-red-700 p-1 rounded-md hover:bg-red-50 transition-colors"
                          title="Xóa mục này"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
