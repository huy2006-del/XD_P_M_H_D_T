import React, { useState } from 'react';
import { CheckCircle2, ShieldCheck, FileText, Loader2, AlertCircle } from 'lucide-react';
import type { RestockItem } from '../types';

interface Props {
  items: RestockItem[];
  isSubmitting: boolean;
  onComplete: (notes?: string) => Promise<void>;
}

export const StepConfirmation: React.FC<Props> = ({ items, isSubmitting, onComplete }) => {
  const [notes, setNotes] = useState('');

  const totalQuantity = items.reduce((sum, item) => sum + item.quantityAdded, 0);

  const handleConfirm = async () => {
    await onComplete(notes.trim() || undefined);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-gray-900">Bước 4: Xác nhận nạp hàng & Cập nhật tồn kho</h2>
        <p className="text-sm text-gray-500">
          Kiểm tra cẩn thận danh sách khay và số lượng trước khi nhấn nút xác nhận ghi vào kho.
        </p>
      </div>

      {/* Danh sách tóm tắt */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-xs">
        <div className="bg-emerald-50/80 px-4 py-3 border-b border-emerald-100 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-700" />
            <h3 className="font-bold text-sm text-emerald-900">Danh mục nạp hàng ({items.length} khay)</h3>
          </div>
          <span className="text-xs font-bold px-2.5 py-1 bg-emerald-600 text-white rounded-full">
            Tổng cộng: +{totalQuantity} quả
          </span>
        </div>

        <div className="divide-y divide-gray-100 text-sm">
          {items.map((item) => (
            <div key={`${item.slotId}-${item.batchId}`} className="p-4 flex justify-between items-center hover:bg-gray-50/50">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-blue-600">Khay {item.slotCode}</span>
                  <span className="text-gray-400">•</span>
                  <span className="font-semibold text-gray-800">{item.productName}</span>
                </div>
                <div className="text-xs text-gray-500 mt-0.5">
                  Mã Lô: <span className="font-mono">{item.batchCode}</span>
                </div>
              </div>

              <div className="text-right">
                <span className="font-mono text-base font-bold text-emerald-700">+{item.quantityAdded}</span>
                <span className="text-xs text-gray-400 block">sản phẩm</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Ghi chú phiên nạp */}
      <div className="space-y-2">
        <label className="block text-sm font-semibold text-gray-700 flex items-center gap-1.5">
          <FileText className="w-4 h-4 text-gray-400" />
          <span>Ghi chú phiên tiếp hàng (Tùy chọn)</span>
        </label>
        <textarea
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          disabled={isSubmitting}
          placeholder="Ví dụ: Tiếp đầy khay sáng thứ 2, kiểm tra nhiệt độ khay ổn định..."
          className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none disabled:bg-gray-100"
        />
        <p className="text-xs text-gray-400">
          Ghi chú sẽ được lưu vào nhật ký kiểm toán (Audit Trail) phục vụ truy vết vận hành.
        </p>
      </div>

      {/* Cảnh báo an toàn */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800 flex items-start gap-2">
        <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
        <div>
          Hệ thống sẽ đồng thời cập nhật tồn kho từng lô trên máy chủ và ghi nhận lịch sử Stock Movement
          cho từng khay hàng theo nguyên tắc bất biến (Audit Trail).
        </div>
      </div>

      {/* Nút hoàn tất */}
      <div className="flex justify-end pt-4">
        <button
          type="button"
          onClick={handleConfirm}
          disabled={isSubmitting || items.length === 0}
          className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3.5 rounded-xl font-bold text-base shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Đang lưu vào kho & ghi Audit...</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="w-5 h-5" />
              <span>XÁC NHẬN NẠP HÀNG</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
