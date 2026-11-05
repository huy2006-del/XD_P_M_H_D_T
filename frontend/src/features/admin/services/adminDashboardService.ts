// Các Interface định nghĩa kiểu dữ liệu chuẩn (Tránh dùng any)
export interface DashboardKPIs {
  totalRevenue: number;
  totalOrders: number;
  onlineMachines: number;
  unresolvedWarnings: number;
}

export interface RevenueData {
  day: string;
  revenue: number;
}

export interface TopProductData {
  name: string;
  sales: number;
}

export interface DashboardData {
  kpis: DashboardKPIs;
  revenueChart: RevenueData[];
  topProductsChart: TopProductData[];
}

export const adminDashboardService = {
  // Lấy dữ liệu cho Dashboard
  getDashboardData: async (): Promise<DashboardData> => {
    // Giả lập delay gọi API 1 giây
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          kpis: {
            totalRevenue: 45500000,
            totalOrders: 1254,
            onlineMachines: 42,
            unresolvedWarnings: 3,
          },
          revenueChart: [
            { day: 'Thứ 2', revenue: 4000000 },
            { day: 'Thứ 3', revenue: 3000000 },
            { day: 'Thứ 4', revenue: 5500000 },
            { day: 'Thứ 5', revenue: 4500000 },
            { day: 'Thứ 6', revenue: 6000000 },
            { day: 'Thứ 7', revenue: 8500000 },
            { day: 'CN', revenue: 9000000 },
          ],
          topProductsChart: [
            { name: 'Táo Mỹ', sales: 400 },
            { name: 'Nho Xanh', sales: 300 },
            { name: 'Cam Úc', sales: 300 },
            { name: 'Cherry', sales: 200 },
            { name: 'Dưa Lưới', sales: 100 },
          ],
        });
      }, 1000);
    });
  },

  // Logic tải file báo cáo CSV/Excel
  exportRevenueReport: async (): Promise<void> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        // Giả lập nội dung file CSV trả về từ Backend
        const csvContent = "Ngay,DoanhThu,SoDon\n01/11/2026,4000000,120\n02/11/2026,3000000,95\n03/11/2026,5500000,150";
        
        // Tạo Blob từ chuỗi nội dung (Hỗ trợ tiếng Việt UTF-8)
        const blob = new Blob(["\ufeff", csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        
        // Tạo thẻ <a> ẩn để trigger hành động tải file của trình duyệt
        const link = document.createElement('a');
        link.href = url;
        const uniqueId = String(Date.now()); // An toàn vì hàm này nằm ngoài Component render
        link.setAttribute('download', `Bao_Cao_Doanh_Thu_${uniqueId}.csv`);
        document.body.appendChild(link);
        
        link.click(); // Kích hoạt tải
        
        // Dọn dẹp
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        resolve();
      }, 1500); // Giả lập thời gian server tạo file mất 1.5s
    });
  }
};
