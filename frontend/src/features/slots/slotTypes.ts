
export type MachineSlot = {
  slotId: number;
  slotCode: string;
  capacity: number;
  currentStock: number;
  status: string;
  productId: number | null;
  productName: string | null;
  productPrice: number | null;
  productImageUrl: string | null;
};

Hoàng Đỗ Gia Huy
export interface SlotBatchDetail {
  batchId: number;
  batchCode: string;
  expiryDate: string;
  quantity: number;
}

export interface MachineSlot {
  id: number;
  machine_id: number;
  slot_code: string; // VD: A1, A2
  product_id: number;
  productName?: string;
  productImage?: string;
  capacity: number;
  current_stock: number;
  status: 'ACTIVE' | 'JAMMED' | 'EMPTY';
  batches?: SlotBatchDetail[]; // Dữ liệu cho Tooltip
}
