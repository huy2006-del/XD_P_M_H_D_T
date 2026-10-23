import React from 'react';
import { getDaysUntilExpiry } from '../../../shared/utils/dateUtils';

interface Props {
  expiryDate: string;
}

export const ExpiryBadge: React.FC<Props> = ({ expiryDate }) => {
  const daysLeft = getDaysUntilExpiry(expiryDate);

  let colorClass = 'bg-green-100 text-green-800'; // An toàn
  let text = 'An toàn';

  if (daysLeft < 0) {
    colorClass = 'bg-red-100 text-red-800'; // Đã hết hạn
    text = 'Đã hết hạn';
  } else if (daysLeft <= 2) {
    colorClass = 'bg-orange-100 text-orange-800'; // Sắp hết hạn (dưới 48h)
    text = `Sắp hết hạn (${daysLeft} ngày)`;
  } else {
    text = `Còn ${daysLeft} ngày`;
  }

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${colorClass}`}>
      {text}
    </span>
  );
};
