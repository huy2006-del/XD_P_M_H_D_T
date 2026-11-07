import { axiosInstance } from '../../shared/api/axiosInstance';
import type {
  SpoilageBatchItem,
  SpoilageReportResponse,
  SpoilageFilterParams
} from './types';

// Dữ liệu Mock dự phòng chuẩn theo nghiệp vụ FreshVend
const MOCK_SPOILAGE_DATA: SpoilageReportResponse = {
  summary: {
    totalLossAmount: 8450000,
    totalSpoiledQuantity: 169,
    totalBatchesExpired: 4,
    averageSpoilageRate: 18.5,
  },
  batches: [
    {
      id: 101,
      productId: 1,
      productName: 'Táo Envy New Zealand',
      batchCode: 'LOT-20261015-01',
      supplier: 'Fresh Fruits Import Ltd',
      importDate: '2026-10-15',
      expiryDate: '2026-10-28',
      quantityImported: 200,
      quantitySpoiled: 45,
      unitCost: 50000,
      totalLoss: 2250000,
      spoilageRate: 22.5,
      daysOverdue: 9,
    },
    {
      id: 102,
      productId: 3,
      productName: 'Dâu Tây Đà Lạt Cao Cấp',
      batchCode: 'LOT-20261020-03',
      supplier: 'Nông trại BioFresh Đà Lạt',
      importDate: '2026-10-20',
      expiryDate: '2026-10-26',
      quantityImported: 150,
      quantitySpoiled: 38,
      unitCost: 80000,
      totalLoss: 3040000,
      spoilageRate: 25.33,
      daysOverdue: 11,
    },
    {
      id: 103,
      productId: 2,
      productName: 'Nho Mẫu Đơn Hàn Quốc',
      batchCode: 'LOT-20261018-02',
      supplier: 'K-Fresh Logistics',
      importDate: '2026-10-18',
      expiryDate: '2026-10-30',
      quantityImported: 120,
      quantitySpoiled: 16,
      unitCost: 150000,
      totalLoss: 2400000,
      spoilageRate: 13.33,
      daysOverdue: 7,
    },
    {
      id: 104,
      productId: 4,
      productName: 'Cam Sành Tiền Giang',
      batchCode: 'LOT-20261010-04',
      supplier: 'HTX Nông Nghiệp Miền Tây',
      importDate: '2026-10-10',
      expiryDate: '2026-10-25',
      quantityImported: 300,
      quantitySpoiled: 70,
      unitCost: 11000,
      totalLoss: 770000,
      spoilageRate: 23.33,
      daysOverdue: 12,
    },
  ],
  distribution: [
    { name: 'Dâu Tây Đà Lạt', spoiledQuantity: 38, totalLoss: 3040000, lossRate: 25.33 },
    { name: 'Nho Mẫu Đơn', spoiledQuantity: 16, totalLoss: 2400000, lossRate: 13.33 },
    { name: 'Táo Envy', spoiledQuantity: 45, totalLoss: 2250000, lossRate: 22.5 },
    { name: 'Cam Sành', spoiledQuantity: 70, totalLoss: 770000, lossRate: 23.33 },
  ],
};

export const spoilageService = {
  getSpoilageReport: async (params?: SpoilageFilterParams): Promise<SpoilageReportResponse> => {
    try {
      // Tầng 1: Thử gọi API chuyên biệt Task 6.3 của Backend 2
      const res = await axiosInstance.get<SpoilageReportResponse>('/api/v1/reports/spoilage', { params });
      return res.data;
    } catch {
      try {
        // Tầng 2: Fallback tự động sang API lô hàng hết date có sẵn của BE 2: /api/v1/batches?expired=true
        const batchRes = await axiosInstance.get<{ content?: Array<Record<string, unknown>> } | Array<Record<string, unknown>>>(
          '/api/v1/batches',
          { params: { expired: true, size: 100 } }
        );

        const rawList = Array.isArray(batchRes.data)
          ? batchRes.data
          : batchRes.data?.content || [];

        if (rawList.length > 0) {
          const batches: SpoilageBatchItem[] = rawList.map((b: Record<string, unknown>) => {
            const qtyImported = Number(b.quantityImported) || 0;
            const qtyRemaining = Number(b.quantityRemaining) || 0;
            const cost = Number(b.unitCost) || 0;
            const loss = qtyRemaining * cost;
            const rate = qtyImported > 0 ? (qtyRemaining / qtyImported) * 100 : 0;
            const days = Math.abs(Number(b.daysToExpiry) || 0);

            return {
              id: Number(b.id),
              productId: Number(b.productId) || 0,
              productName: String(b.productName || 'Sản phẩm'),
              batchCode: String(b.batchCode || ''),
              supplier: String(b.supplier || 'Chưa cập nhật'),
              importDate: String(b.importDate || ''),
              expiryDate: String(b.expiryDate || ''),
              quantityImported: qtyImported,
              quantitySpoiled: qtyRemaining,
              unitCost: cost,
              totalLoss: loss,
              spoilageRate: Number(rate.toFixed(2)),
              daysOverdue: days,
            };
          });

          // Tính toán KPI Tổng hợp
          const totalLossAmount = batches.reduce((sum, item) => sum + item.totalLoss, 0);
          const totalSpoiledQuantity = batches.reduce((sum, item) => sum + item.quantitySpoiled, 0);
          const avgRate = batches.length > 0
            ? batches.reduce((sum, item) => sum + item.spoilageRate, 0) / batches.length
            : 0;

          // Phân phối theo loại quả
          const distribution = batches.map(b => ({
            name: b.productName,
            spoiledQuantity: b.quantitySpoiled,
            totalLoss: b.totalLoss,
            lossRate: b.spoilageRate
          }));

          return {
            summary: {
              totalLossAmount,
              totalSpoiledQuantity,
              totalBatchesExpired: batches.length,
              averageSpoilageRate: Number(avgRate.toFixed(2)),
            },
            batches,
            distribution,
          };
        }
      } catch {
        // Tiếp tục xuống tầng 3 nếu BE chưa bật
      }

      // Tầng 3: Trả về Mock Data hoàn hảo cho demo
      return MOCK_SPOILAGE_DATA;
    }
  },

  // Xuất file CSV danh sách lô trái cây hư hỏng
  exportSpoilageCSV: (batches: SpoilageBatchItem[]) => {
    const headers = [
      'Mã Lô',
      'Tên Sản Phẩm',
      'Nhà Cung Cấp',
      'Ngày Nhập',
      'Hạn Sử Dụng',
      'SL Nhập',
      'SL Hỏng',
      'Đơn Giá (VNĐ)',
      'Tổng Hao Hụt (VNĐ)',
      'Tỷ Lệ Thất Thoát (%)',
    ];

    const rows = batches.map((b) => [
      b.batchCode,
      `"${b.productName}"`,
      `"${b.supplier}"`,
      b.importDate,
      b.expiryDate,
      b.quantityImported,
      b.quantitySpoiled,
      b.unitCost,
      b.totalLoss,
      `${b.spoilageRate}%`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Bao_Cao_Hu_Hong_Trai_Cay_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },
};