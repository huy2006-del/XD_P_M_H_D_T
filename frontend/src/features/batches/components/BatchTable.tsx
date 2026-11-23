import React from 'react';
import type { FruitBatch } from '../types';
import { ExpiryBadge } from './ExpiryBadge';
import { formatDate } from '../../../shared/utils/dateUtils';
import { formatCurrency } from '../../../shared/utils/format';
import { Package, Inbox } from 'lucide-react';

interface Props {
  batches: FruitBatch[];
  loading?: boolean;
}

export const BatchTable: React.FC<Props> = ({ batches, loading }) => {
  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-emerald-500 border-t-transparent mb-3" />
        <p className="text-gray-500 text-sm">Đang tải danh sách lô hàng từ máy chủ...</p>
      </div>
    );
  }

  if (batches.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
        <Inbox className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <h3 className="text-base font-semibold text-gray-700">Chưa có lô hàng nào</h3>
        <p className="text-sm text-gray-500 mt-1">
          Không tìm thấy lô hàng nào phù hợp với bộ lọc hiện tại hoặc kho chưa nhập lô mới.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto bg-white rounded-xl shadow-sm border border-gray-100">
      <table className="min-w-full text-left border-collapse text-sm">
        <thead className="bg-gray-50 border-b border-gray-200/80 text-gray-600 font-semibold">
          <tr>
            <th className="p-4">Mã Lô</th>
            <th className="p-4">Sản Phẩm</th>
            <th className="p-4">Nhà Cung Cấp</th>
            <th className="p-4">Ngày Nhập</th>
            <th className="p-4">Hạn Sử Dụng</th>
            <th className="p-4">Tồn Kho (Còn / Nhập)</th>
            <th className="p-4">Giá Vốn</th>
            <th className="p-4 text-center">Tình Trạng Hạn</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 text-gray-700">
          {batches.map((batch) => {
            const percentRemaining =
              batch.quantityImported > 0
                ? Math.round((batch.quantityRemaining / batch.quantityImported) * 100)
                : 0;

            const isOutOfStock = batch.quantityRemaining === 0;

            return (
              <tr key={batch.id} className="hover:bg-gray-50/60 transition-colors">
                <td className="p-4 font-mono font-bold text-gray-900">
                  <div className="flex items-center gap-1.5">
                    <Package className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{batch.batchCode}</span>
                  </div>
                </td>
                <td className="p-4">
                  <span className="font-semibold text-gray-900">
                    {batch.productName || `SP #${batch.productId}`}
                  </span>
                  <span className="block text-xs text-gray-400">ID: {batch.productId}</span>
                </td>
                <td className="p-4 text-gray-600">
                  {batch.supplier || <span className="italic text-gray-400">—</span>}
                </td>
                <td className="p-4 text-gray-600 font-mono text-xs">
                  {formatDate(batch.importDate)}
                </td>
                <td className="p-4 font-mono text-xs font-semibold text-gray-900">
                  {formatDate(batch.expiryDate)}
                </td>
                <td className="p-4">
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className={`font-bold ${isOutOfStock ? 'text-gray-400' : 'text-emerald-700'}`}>
                        {batch.quantityRemaining}
                      </span>
                      <span className="text-gray-400">/ {batch.quantityImported}</span>
                    </div>
                    <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          isOutOfStock
                            ? 'bg-gray-300'
                            : percentRemaining <= 20
                              ? 'bg-amber-500'
                              : 'bg-emerald-500'
                        }`}
                        style={{ width: `${percentRemaining}%` }}
                      />
                    </div>
                  </div>
                </td>
                <td className="p-4 font-mono text-xs text-gray-900">
                  {batch.unitCost ? formatCurrency(batch.unitCost) : '—'}
                </td>
                <td className="p-4 text-center">
                  <ExpiryBadge
                    expiryDate={batch.expiryDate}
                    expired={batch.expired}
                    daysToExpiry={batch.daysToExpiry}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
