import React from 'react';
import { getDaysUntilExpiry } from '../../../shared/utils/dateUtils';
import { AlertTriangle, Clock, CheckCircle, XCircle } from 'lucide-react';

interface Props {
  expiryDate: string;
  expired?: boolean;
  daysToExpiry?: number;
}

export const ExpiryBadge: React.FC<Props> = ({ expiryDate, expired, daysToExpiry }) => {
  const calculatedDays = typeof daysToExpiry === 'number' 
    ? daysToExpiry 
    : getDaysUntilExpiry(expiryDate);
  const isExpired = expired ?? (calculatedDays < 0);

  if (isExpired || calculatedDays < 0) {
    const overdueDays = Math.abs(calculatedDays);
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-200">
        <XCircle className="w-3.5 h-3.5" />
        Đã hết hạn {overdueDays > 0 ? `(${overdueDays} ngày)` : ''}
      </span>
    );
  }

  if (calculatedDays <= 2) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-700 border border-rose-200 animate-pulse">
        <AlertTriangle className="w-3.5 h-3.5" />
        Sắp hết hạn ({calculatedDays} ngày)
      </span>
    );
  }

  if (calculatedDays <= 5) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
        <Clock className="w-3.5 h-3.5" />
        Cần ưu tiên ({calculatedDays} ngày)
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
      <CheckCircle className="w-3.5 h-3.5" />
      Còn {calculatedDays} ngày
    </span>
  );
};
