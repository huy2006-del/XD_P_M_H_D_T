import React from 'react';
import type { RestockItem } from '../types';

interface Props {
  items: RestockItem[];
  isSubmitting: boolean;
  onComplete: () => Promise<void>;
}

export const StepConfirmation: React.FC<Props> = ({ items, isSubmitting, onComplete }) => {
  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Bước 4: Xác nhận & Hoàn tất</h2>
      
      <div className="bg-white p-4 border rounded-lg mb-6">
        <h3 className="font-bold border-b pb-2 mb-2">Kiểm tra trước khi nạp</h3>
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={`${item.slotId}-${item.batchId}`} className="flex justify-between text-sm">
              <span>Khay <b>{item.slotCode}</b> - Lô <b>{item.batchCode}</b></span>
              <span className="font-semibold text-green-600">+{item.quantityAdded} sản phẩm</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex justify-end">
        <button 
          onClick={() => void onComplete()}
          disabled={isSubmitting || items.length === 0}
          className="bg-green-600 text-white px-8 py-3 rounded-lg font-bold text-lg hover:bg-green-700 disabled:opacity-50 shadow-lg"
        >
          {isSubmitting ? 'Đang xử lý...' : 'XÁC NHẬN HOÀN TẤT NẠP HÀNG'}
        </button>
      </div>
    </div>
  );
};