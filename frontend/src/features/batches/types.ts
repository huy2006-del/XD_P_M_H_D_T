export interface FruitBatch {
  id: number;
  productId: number;
  productName: string;
  batchCode: string;
  supplier: string;
  importDate: string;
  expiryDate: string;
  quantityImported: number;
  quantityRemaining: number;
  unitCost: number;
  expired: boolean;
  daysToExpiry: number;
}

export interface CreateBatchRequest {
  productId: number;
  batchCode: string;
  supplier: string;
  expiryDate: string;
  quantityImported: number;
  unitCost: number;
}
