import { axiosInstance } from '../../shared/api/axiosInstance';
import type { SpoilageBatchItem, SpoilageReportResponse, SpoilageFilterParams } from './types';

export const spoilageService = {
  async getSpoilageReport(params?: SpoilageFilterParams): Promise<SpoilageReportResponse> {
    const response = await axiosInstance.get<SpoilageReportResponse>('/api/v1/reports/spoilage', {
      params: {
        search: params?.search?.trim() || undefined,
        supplier: params?.supplier?.trim() || undefined,
      },
    });
    return response.data;
  },

  exportSpoilageCSV(batches: SpoilageBatchItem[]) {
    const headers = ['Mã Lô', 'Tên Sản Phẩm', 'Nhà Cung Cấp', 'Ngày Nhập', 'Hạn Sử Dụng', 'SL Nhập', 'SL Hỏng', 'Đơn Giá (VNĐ)', 'Tổng Hao Hụt (VNĐ)', 'Tỷ Lệ Thất Thoát (%)'];
    const escape = (value: unknown) => `"${String(value ?? '').replaceAll('"', '""')}"`;
    const rows = batches.map((batch) => [batch.batchCode, batch.productName, batch.supplier, batch.importDate, batch.expiryDate, batch.quantityImported, batch.quantitySpoiled, batch.unitCost, batch.totalLoss, `${batch.spoilageRate}%`].map(escape).join(','));
    const blob = new Blob(['\ufeff', headers.map(escape).join(','), '\r\n', rows.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `bao-cao-hao-hut-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },
};
