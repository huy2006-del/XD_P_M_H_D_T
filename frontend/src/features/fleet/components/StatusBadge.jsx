import React from 'react';

export const StatusBadge = ({ status }) => {
  const styles = {
    ONLINE: 'bg-green-100 text-green-700 border-green-200',
    OFFLINE: 'bg-gray-100 text-gray-700 border-gray-200',
    MAINTENANCE: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    ERROR: 'bg-red-100 text-red-700 border-red-200',
    OUT_OF_ORDER: 'bg-rose-100 text-rose-800 border-rose-300',
  };

  const labels = {
    ONLINE: 'Hoạt động',
    OFFLINE: 'Mất kết nối',
    MAINTENANCE: 'Bảo trì',
    ERROR: 'Lỗi thiết bị',
    OUT_OF_ORDER: 'Ngừng hoạt động',
  };

  return (
    <span
      className={`px-2.5 py-1 rounded-full text-xs font-medium border ${
        styles[status] || 'bg-slate-100 text-slate-700 border-slate-200'
      }`}
    >
      {labels[status] || status || 'Không xác định'}
    </span>
  );
};

export default StatusBadge;