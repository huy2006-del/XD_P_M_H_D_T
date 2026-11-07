import React from 'react';
import { AlertCircle } from 'lucide-react';
import { formatCurrency, formatNumber } from '../../../shared/utils/format';
import { formatDate } from '../../../shared/utils/dateUtils';
import type { SpoilageBatchItem } from '../types';

interface Props {
  batches: SpoilageBatchItem[];
}

export const SpoilageTable: React.FC<Props> = ({ batches }) => {
  if (batches.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500 bg-white rounded-xl border border-gray-100">
        <AlertCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
        <p className="font-medium text-gray-700">Tuyệt vời! Không có lô hàng nào bị quá hạn.</p>
        <p className="text-sm text-gray-400 mt-1">Toàn bộ trái cây đều đang trong hạn sử dụng an toàn.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="overflow-x-auto w-full">
        <table className="w-full text-left border-collapse whitespace-nowrap text-sm">
          <thead>
            <tr className="bg-gray-50/80 border-b border-gray-100 text-gray-500">
              <th className="p-4 font-semibold">Mã Lô</th>
              <th className="p-4 font-semibold">Sản Phẩm</th>
              <th className="p-4 font-semibold">Nhà Cung Cấp</th>
              <th className="p-4 font-semibold">Ngày Nhập</th>
              <th className="p-4 font-semibold">Hạn Dùng</th>
              <th className="p-4 font-semibold text-center">Hỏng / Nhập</th>
              <th className="p-4 font-semibold text-right">Giá Vốn</th>
              <th className="p-4 font-semibold text-right">Tiền Hao Hụt</th>
              <th className="p-4 font-semibold text-center">Tỷ Lệ Thất Thoát</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {batches.map((batch) => {
              const isHighLoss = batch.spoilageRate >= 20;

              return (
                <tr key={batch.id} className="hover:bg-red-50/30 transition-colors">
                  <td className="p-4 font-medium text-blue-600 font-mono">{batch.batchCode}</td>
                  <td className="p-4 font-semibold text-gray-900">{batch.productName}</td>
                  <td className="p-4 text-gray-600">{batch.supplier}</td>
                  <td className="p-4 text-gray-500">{formatDate(batch.importDate)}</td>
                  <td className="p-4 text-red-600 font-medium">
                    {formatDate(batch.expiryDate)}
                    <span className="ml-1.5 text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-normal">
                      +{batch.daysOverdue} ngày
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    <span className="font-bold text-red-600">{formatNumber(batch.quantitySpoiled)}</span>
                    <span className="text-gray-400 text-xs"> / {formatNumber(batch.quantityImported)}</span>
                  </td>
                  <td className="p-4 text-right text-gray-600">{formatCurrency(batch.unitCost)}</td>
                  <td className="p-4 text-right font-bold text-red-600">{formatCurrency(batch.totalLoss)}</td>
                  <td className="p-4 text-center">
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                        isHighLoss
                          ? 'bg-red-100 text-red-700 ring-1 ring-red-200'
                          : 'bg-amber-100 text-amber-700 ring-1 ring-amber-200'
                      }`}
                    >
                      {batch.spoilageRate}%
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};