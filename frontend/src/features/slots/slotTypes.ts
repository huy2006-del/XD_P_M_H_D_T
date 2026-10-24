export interface SlotBatchDetail {
  batchId: number;
  batchCode: string;
  expiryDate: string;
  quantity: number;
}
export interface MachineSlot {
  // Thông tin hộc chứa
  slotId: number;
  slotCode: string;
  capacity: number;
  currentStock: number;
  status: string;

  // Thông tin sản phẩm
  productId: number | null;
  productName: string | null;
  productPrice: number | null;
  productImageUrl: string | null;

  // Danh sách lô hàng (không bắt buộc)
  batches?: SlotBatchDetail[];
}
