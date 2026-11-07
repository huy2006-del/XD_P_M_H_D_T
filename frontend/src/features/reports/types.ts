export interface SpoilageBatchItem {
  id: number;
  productId: number;
  productName: string;
  batchCode: string;
  supplier: string;
  importDate: string;
  expiryDate: string;
  quantityImported: number;
  quantitySpoiled: number; // Số lượng trái cây bị quá hạn (tồn kho còn lại)
  unitCost: number;        // Giá vốn mỗi quả
  totalLoss: number;       // Tổng thiệt hại = quantitySpoiled * unitCost
  spoilageRate: number;    // % thất thoát = (quantitySpoiled / quantityImported) * 100
  daysOverdue: number;     // Số ngày đã quá hạn
}

export interface SpoilageSummary {
  totalLossAmount: number;      // Tổng số tiền hao hụt (VNĐ)
  totalSpoiledQuantity: number; // Tổng số quả quá date phải tiêu hủy
  totalBatchesExpired: number;  // Số lô bị quá hạn
  averageSpoilageRate: number;  // Tỷ lệ thất thoát trung bình (%)
}

export interface ProductLossDistribution {
  name: string;
  spoiledQuantity: number;
  totalLoss: number;
  lossRate: number;
}

export interface SpoilageReportResponse {
  summary: SpoilageSummary;
  batches: SpoilageBatchItem[];
  distribution: ProductLossDistribution[];
}

export interface SpoilageFilterParams {
  search?: string;
  supplier?: string;
}