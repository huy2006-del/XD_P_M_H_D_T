
import React from 'react';
import { Activity, CheckCircle2, AlertCircle } from 'lucide-react';

export const QuickStats = ({ stats }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
          <Activity className="w-6 h-6" />
        </div>
        <div>
          <p className="text-sm font-medium text-gray-500">Tổng số máy</p>
          <h3 className="text-2xl font-bold text-gray-900">{stats.total}</h3>
        </div>
      </div>
      
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center text-green-600">
          <CheckCircle2 className="w-6 h-6" />
        </div>
        <div>
          <p className="text-sm font-medium text-gray-500">Đang hoạt động</p>
          <h3 className="text-2xl font-bold text-gray-900">{stats.active}</h3>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center text-red-600">
          <AlertCircle className="w-6 h-6" />
        </div>
        <div>
          <p className="text-sm font-medium text-gray-500">Lỗi / Bảo trì</p>
          <h3 className="text-2xl font-bold text-gray-900">{stats.error}</h3>
        </div>
      </div>
    </div>
  );
};

export default QuickStats;
