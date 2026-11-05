import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend 
} from 'recharts';
import toast, { Toaster } from 'react-hot-toast';

import { adminDashboardService, type DashboardData } from '../services/adminDashboardService';

// Bảng màu cho Biểu đồ Tròn
const PIE_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

export const AdminDashboardPage: React.FC = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Load dữ liệu khi vào trang
  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      try {
        setLoading(true);
        const result = await adminDashboardService.getDashboardData();
        if (isMounted) setData(result);
      } catch {

        toast.error("Không thể tải dữ liệu Dashboard!");
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchData();
    
    return () => { isMounted = false; };
  }, []);

  // Hàm xử lý tải báo cáo (Nhiệm vụ 6.8)
  const handleExportReport = async () => {
    try {
      setIsExporting(true);
      toast.loading("Đang tạo tệp báo cáo...", { id: 'export-toast' });
      
      await adminDashboardService.exportRevenueReport();
      
      toast.success("Tải báo cáo doanh thu thành công!", { id: 'export-toast' });
    } catch {

      toast.error("Lỗi khi tải báo cáo!", { id: 'export-toast' });
    } finally {
      setIsExporting(false);
    }
  };

  // Render Skeleton Loading
  if (loading || !data) {
    return (
      <div className="p-8 flex items-center justify-center h-screen bg-gray-50">
        <div className="text-xl text-gray-500 animate-pulse font-semibold">Đang tải trung tâm điều khiển...</div>
      </div>
    );
  }

  return (
    <div className="p-8 bg-gray-50 min-h-screen font-sans">
      <Toaster position="top-right" reverseOrder={false} />

      {/* --- HEADER & NÚT XUẤT BÁO CÁO --- */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <h1 className="text-3xl font-bold text-gray-800">Dashboard Tổng Quan</h1>
        
        <button 
          onClick={handleExportReport}
          disabled={isExporting}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-bold text-white shadow-md transition-all ${
            isExporting ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 active:scale-95'
          }`}
        >
          {isExporting ? (
            <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full inline-block"></span>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          )}
          {isExporting ? 'Đang xuất...' : 'Xuất Báo Cáo Doanh Thu'}
        </button>
      </div>

      {/* --- 4 THẺ KPI NỔI BẬT --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <KpiCard title="Tổng Doanh Thu" value={`${data.kpis.totalRevenue.toLocaleString('vi-VN')} đ`} color="text-blue-600" bg="bg-blue-100" />
        <KpiCard title="Đơn Đã Bán" value={data.kpis.totalOrders.toString()} color="text-green-600" bg="bg-green-100" />
        <KpiCard title="Số Máy Online" value={`${data.kpis.onlineMachines} / 45`} color="text-indigo-600" bg="bg-indigo-100" />
        <KpiCard title="Cảnh Báo Chưa Xử Lý" value={data.kpis.unresolvedWarnings.toString()} color="text-red-600" bg="bg-red-100" />
      </div>

      {/* --- BIỂU ĐỒ --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Biểu đồ Cột: Doanh thu theo tuần */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 lg:col-span-2">
          <h2 className="text-xl font-bold text-gray-700 mb-6">Doanh Thu Trong Tuần</h2>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.revenueChart} margin={{ top: 10, right: 10, left: 20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#6B7280' }} dy={10} />
                <YAxis 
                  tickFormatter={(val) => `${(Number(val) / 1000000)}M`} 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#6B7280' }} 
                />
                <RechartsTooltip 
                  cursor={{ fill: '#F3F4F6' }}

                  formatter={(value) => {
                    const numericValue = typeof value === 'number' ? value : Number(value) || 0;
                    return [`${numericValue.toLocaleString('vi-VN')} VNĐ`, 'Doanh thu'];
                  }}
                />
                <Bar dataKey="revenue" fill="#3B82F6" radius={[6, 6, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Biểu đồ Tròn: Tỷ trọng sản phẩm bán chạy */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h2 className="text-xl font-bold text-gray-700 mb-6">Top 5 Trái Cây Bán Chạy</h2>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.topProductsChart}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="sales"
                  nameKey="name"
                >
                  {data.topProductsChart.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>

                <RechartsTooltip 
                  formatter={(value) => {
                    const numericValue = typeof value === 'number' ? value : Number(value) || 0;
                    return [`${numericValue} đơn`, 'Đã bán'];
                  }} 
                />
                <Legend verticalAlign="bottom" height={36} iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
};

// Component Thẻ KPI nhỏ gọn tái sử dụng
const KpiCard: React.FC<{ title: string; value: string; color: string; bg: string }> = ({ title, value, color, bg }) => (
  <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between hover:shadow-md transition-shadow">
    <div>
      <p className="text-sm font-semibold text-gray-500 mb-1">{title}</p>
      <p className={`text-3xl font-black ${color}`}>{value}</p>
    </div>
    <div className={`w-12 h-12 rounded-full ${bg} flex items-center justify-center ${color}`}>
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    </div>
  </div>
);
