import { axiosInstance } from '../../shared/api/axiosInstance';
import type { SpoilageBatchItem, SpoilageReportResponse, SpoilageFilterParams } from './types';

interface ExpiredBatchDto {
  id: number;
  productId: number;
  productName: string;
  batchCode: string;
  supplier?: string;
  importDate: string;
  expiryDate: string;
  quantityImported: number;
  quantityRemaining: number;
  unitCost: number;
  daysToExpiry: number;
}
interface BatchPage { content?: ExpiredBatchDto[]; totalPages?: number; }

export const spoilageService = {
  async getSpoilageReport(params?: SpoilageFilterParams): Promise<SpoilageReportResponse> {
    // Backend hiện có API lô hết hạn; report aggregation endpoint chưa được triển khai.
    const first = await axiosInstance.get<BatchPage | ExpiredBatchDto[]>('/api/v1/batches', {
      params: { expired: true, page: 0, size: 100 },
    });
    let expired = Array.isArray(first.data) ? first.data : (first.data.content ?? []);
    if (!Array.isArray(first.data) && (first.data.totalPages ?? 1) > 1) {
      const remainingPages = await Promise.all(Array.from({ length: (first.data.totalPages ?? 1) - 1 }, (_, index) =>
        axiosInstance.get<BatchPage>('/api/v1/batches', {
          params: { expired: true, page: index + 1, size: 100 },
        })
      ));
      expired = [...expired, ...remainingPages.flatMap((response) => response.data.content ?? [])];
    }
    const query = params?.search?.trim().toLowerCase();
    if (query) expired = expired.filter((batch) => [batch.batchCode, batch.productName, batch.supplier].some((value) => value?.toLowerCase().includes(query)));

    const batches: SpoilageBatchItem[] = expired
      .filter((batch) => batch.quantityRemaining > 0)
      .map((batch) => {
        const quantitySpoiled = Number(batch.quantityRemaining) || 0;
        const quantityImported = Number(batch.quantityImported) || 0;
        const unitCost = Number(batch.unitCost) || 0;
        return {
          id: batch.id,
          productId: batch.productId,
          productName: batch.productName,
          batchCode: batch.batchCode,
          supplier: batch.supplier || 'Chưa cập nhật',
          importDate: batch.importDate,
          expiryDate: batch.expiryDate,
          quantityImported,
          quantitySpoiled,
          unitCost,
          totalLoss: quantitySpoiled * unitCost,
          spoilageRate: quantityImported > 0 ? Number(((quantitySpoiled / quantityImported) * 100).toFixed(2)) : 0,
          daysOverdue: Math.max(0, -Number(batch.daysToExpiry || 0)),
        };
      });
    const totalLossAmount = batches.reduce((sum, batch) => sum + batch.totalLoss, 0);
    const totalSpoiledQuantity = batches.reduce((sum, batch) => sum + batch.quantitySpoiled, 0);
    const grouped = batches.reduce<Record<string, { name: string; spoiledQuantity: number; importedQuantity: number; totalLoss: number; lossRate: number }>>((acc, batch) => {
      const current = acc[batch.productName] ?? { name: batch.productName, spoiledQuantity: 0, importedQuantity: 0, totalLoss: 0, lossRate: 0 };
      current.spoiledQuantity += batch.quantitySpoiled;
      current.importedQuantity += batch.quantityImported;
      current.totalLoss += batch.totalLoss;
      acc[batch.productName] = current;
      return acc;
    }, {});
    const distribution = Object.values(grouped).map(({ importedQuantity, ...product }) => ({
      ...product,
      lossRate: importedQuantity > 0 ? Number(((product.spoiledQuantity / importedQuantity) * 100).toFixed(2)) : 0,
    }));
    return {
      summary: {
        totalLossAmount,
        totalSpoiledQuantity,
        totalBatchesExpired: batches.length,
        averageSpoilageRate: batches.reduce((sum, batch) => sum + batch.quantityImported, 0) > 0
          ? Number(((totalSpoiledQuantity / batches.reduce((sum, batch) => sum + batch.quantityImported, 0)) * 100).toFixed(2))
          : 0,
      },
      batches,
      distribution,
    };
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
