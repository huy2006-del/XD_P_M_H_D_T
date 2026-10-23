import React from 'react';
import { FruitBatch } from '../types';
import { ExpiryBadge } from './ExpiryBadge';
import { formatDate } from '../../../shared/utils/dateUtils';

interface Props {
  batches: FruitBatch[];
}

export const BatchTable: React.FC<Props> = ({ batches }) => {
  return (
    <div className="overflow-x-auto bg-white rounded-lg shadow">
      <table className="min-w-full text-left border-collapse">
        <thead className="bg-gray-50 border-b">
          <tr>
            <th className="p-4 font-semibold text-gray-600">Mã Lô</th>
            <th className="p-4 font-semibold text-gray-600">Sản Phẩm</th>
            <th className="p-4 font-semibold text-gray-600">Nhà Cung Cấp</th>
            <th className="p-4 font-semibold text-gray-600">Ngày Nhập</th>
            <th className="p-4 font-semibold text-gray-600">Hạn Sử Dụng</th>
            <th className="p-4 font-semibold text-gray-600">Tồn Kho</th>
            <th className="p-4 font-semibold text-gray-600">Trạng Thái Hạn</th>
          </tr>
        </thead>
        <tbody>
          {batches.map((batch) => (
            <tr key={batch.id} className="border-b hover:bg-gray-50">
              <td className="p-4 font-medium">{batch.batch_code}</td>
              <td className="p-4">{batch.productName || `SP #${batch.product_id}`}</td>
              <td className="p-4">{batch.supplier}</td>
              <td className="p-4">{formatDate(batch.import_date)}</td>
              <td className="p-4">{formatDate(batch.expiry_date)}</td>
              <td className="p-4">
                <span className="font-semibold">{batch.quantity_remaining}</span> 
                <span className="text-gray-400"> / {batch.quantity_imported}</span>
              </td>
              <td className="p-4">
                <ExpiryBadge expiryDate={batch.expiry_date} />
              </td>
            </tr>
          ))}
          {batches.length === 0 && (
            <tr>
              <td colSpan={7} className="text-center p-6 text-gray-500">Không có lô hàng nào.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};
