import React from 'react';

export const StatusBadge = ({ status }) => {
  const styles = {
    ONLINE: 'bg-green-100 text-green-700 border-green-200',
    OFFLINE: 'bg-gray-100 text-gray-700 border-gray-200',
    MAINTENANCE: 'bg-yellow-100 text-yellow-700 border-yellow-200'
  };
  
  const labels = {
    ONLINE: 'Hoạt động',
    OFFLINE: 'Mất kết nối',
    MAINTENANCE: 'Bảo trì'
  };

  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${styles[status]}`}>
      {labels[status]}
    </span>
  );
};

export default StatusBadge;
