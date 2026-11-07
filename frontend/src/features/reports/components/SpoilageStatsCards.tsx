import React from 'react';
import { DollarSign, AlertOctagon, Layers, TrendingDown } from 'lucide-react';
import { formatCurrency, formatNumber } from '../../../shared/utils/format';
import type { SpoilageSummary } from '../types';

interface Props {
  summary: SpoilageSummary;
}

export const SpoilageStatsCards: React.FC<Props> = ({ summary }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* Tổng tiền thiệt hại */}
      <div className="bg-white p-5 rounded-xl border border-red-100 shadow-sm flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Số tiền hao hụt</p>
          <p className="text-2xl font-black text-red-600 mt-1">{formatCurrency(summary.totalLossAmount)}</p>
          <span className="text-xs text-red-500 font-medium">Giá trị hàng phải tiêu hủy</span>
        </div>
        <div className="w-12 h-12 bg-red-50 text-red-600 rounded-xl flex items-center justify-center">
          <DollarSign className="w-6 h-6" />
        </div>
      </div>

      {/* Số lượng trái cây hỏng */}
      <div className="bg-white p-5 rounded-xl border border-amber-100 shadow-sm flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Số lượng quá date</p>
          <p className="text-2xl font-black text-amber-600 mt-1">{formatNumber(summary.totalSpoiledQuantity)} quả</p>
          <span className="text-xs text-amber-500 font-medium">Cần dọn khỏi khay/kho</span>
        </div>
        <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
          <AlertOctagon className="w-6 h-6" />
        </div>
      </div>

      {/* Số lô bị ảnh hưởng */}
      <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Lô quá hạn</p>
          <p className="text-2xl font-black text-gray-800 mt-1">{summary.totalBatchesExpired} lô</p>
          <span className="text-xs text-gray-400 font-medium">Cần lập biên bản hủy</span>
        </div>
        <div className="w-12 h-12 bg-gray-100 text-gray-600 rounded-xl flex items-center justify-center">
          <Layers className="w-6 h-6" />
        </div>
      </div>

      {/* Tỷ lệ thất thoát bình quân */}
      <div className="bg-white p-5 rounded-xl border border-purple-100 shadow-sm flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Tỷ lệ thất thoát</p>
          <p className="text-2xl font-black text-purple-600 mt-1">{summary.averageSpoilageRate}%</p>
          <span className="text-xs text-purple-500 font-medium">Bình quân trên các lô</span>
        </div>
        <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center">
          <TrendingDown className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
};