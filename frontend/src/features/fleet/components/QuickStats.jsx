import React from 'react';
import {
  Activity,
  CheckCircle2,
  WifiOff,
  Wrench,
  AlertCircle,
  BellRing,
} from 'lucide-react';

export const QuickStats = ({ stats, activeFilter = 'ALL', onSelectStatus }) => {
  const cards = [
    {
      key: 'ALL',
      label: 'Tổng số máy',
      value: stats.total ?? 0,
      icon: <Activity className="w-5 h-5" />,
      iconBg: 'bg-blue-50 text-blue-600',
      valueColor: 'text-gray-900',
    },
    {
      key: 'ONLINE',
      label: 'Online',
      value: stats.online ?? stats.active ?? 0,
      icon: <CheckCircle2 className="w-5 h-5" />,
      iconBg: 'bg-emerald-50 text-emerald-600',
      valueColor: 'text-emerald-700',
    },
    {
      key: 'OFFLINE',
      label: 'Offline',
      value: stats.offline ?? 0,
      icon: <WifiOff className="w-5 h-5" />,
      iconBg: 'bg-slate-100 text-slate-600',
      valueColor: 'text-slate-700',
    },
    {
      key: 'MAINTENANCE',
      label: 'Bảo trì',
      value: stats.maintenance ?? 0,
      icon: <Wrench className="w-5 h-5" />,
      iconBg: 'bg-amber-50 text-amber-600',
      valueColor: 'text-amber-700',
    },
    {
      key: 'OUT_OF_ORDER',
      label: 'Lỗi / Ngừng HĐ',
      value: stats.outOfOrder ?? 0,
      icon: <AlertCircle className="w-5 h-5" />,
      iconBg: 'bg-red-50 text-red-600',
      valueColor: 'text-red-700',
    },
    {
      key: null,
      label: 'Cảnh báo chưa xử lý',
      value: stats.unresolvedAlerts ?? 0,
      icon: <BellRing className="w-5 h-5" />,
      iconBg: 'bg-rose-50 text-rose-600',
      valueColor: 'text-rose-600',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
      {cards.map((card) => {
        const isClickable = card.key !== null && typeof onSelectStatus === 'function';
        const isSelected = isClickable && activeFilter === card.key;
        return (
          <button
            key={card.label}
            type="button"
            disabled={!isClickable}
            onClick={() => isClickable && onSelectStatus(card.key)}
            className={`text-left bg-white rounded-xl shadow-sm border p-4 flex items-center gap-3 transition-all ${
              isSelected
                ? 'border-blue-500 ring-2 ring-blue-100'
                : 'border-gray-100'
            } ${isClickable ? 'hover:border-blue-300 cursor-pointer' : 'cursor-default'}`}
          >
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${card.iconBg}`}
            >
              {card.icon}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-gray-500 truncate">{card.label}</p>
              <h3 className={`text-xl font-bold ${card.valueColor}`}>{card.value}</h3>
            </div>
          </button>
        );
      })}
    </div>
  );
};

export default QuickStats;