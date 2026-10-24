import React from 'react';
import type { SlotBatchDetail } from '../slotTypes';
import { getDaysUntilExpiry } from '../../../shared/utils/dateUtils';

export const BatchTooltip: React.FC<{ batches?: SlotBatchDetail[] }> = ({ batches }) => {
  if (!batches || batches.length === 0) {
    return <div className="text-xs text-gray-500">Khay trống</div>;
  }

  return (
    <div className="absolute z-10 w-48 p-2 mt-2 bg-gray-800 text-white text-xs rounded shadow-lg pointer-events-none">
      <p className="font-bold border-b border-gray-600 pb-1 mb-1">Chi tiết Lô trong khay:</p>
      <ul className="space-y-1">
        {batches.map((b, idx) => {
          const daysLeft = getDaysUntilExpiry(b.expiryDate);
          return (
            <li key={idx} className="flex justify-between">
              <span>{b.batchCode}</span>
              <span className={daysLeft <= 2 ? 'text-red-400 font-bold' : 'text-green-400'}>
                {daysLeft < 0 ? 'Hết hạn' : `Còn ${daysLeft} ngày`}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
};
