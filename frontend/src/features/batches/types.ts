export interface FruitBatch {
  id: number;
  product_id: number;
  batch_code: string;
  supplier: string;
  import_date: string;
  expiry_date: string;
  quantity_imported: number;
  quantity_remaining: number;
  unit_cost: number;
  productName?: string; // Optional nếu Backend join sẵn
}

export interface CreateBatchRequest {
  productId: number;
  batchCode: string;
  supplier: string;
  expiryDate: string;
  quantityImported: number;
  unitCost: number;
}
