// 1. DTO Trạng thái máy
export interface MachineStatusDTO {
  machineId: number;
  status: 'ONLINE' | 'OFFLINE' | 'MAINTENANCE';
  temperature: number;
}

// 2. DTO Khay hàng (Nhận từ GET /slots)
export interface MachineSlotDTO {
  slotId: number;
  slotCode: string;
  productName: string;
  price: number;
  productPrice?: number;
  capacity?: number;
  currentStock: number;
  productImageUrl?: string;
  status: 'AVAILABLE' | 'OUT_OF_STOCK';
}

// 3. DTO Tạo đơn hàng (Gửi POST /orders)
export interface OrderItemRequest {
  slotId: number;
  quantity: number;
}

export interface CreateOrderRequest {
  machineId: number;
  items: OrderItemRequest[];
}

// 4. DTO Phản hồi tạo đơn
export interface OrderResponse {
  orderId: string;
  orderCode: string;
  totalAmount: number;
  qrCodeUrl: string; // Link VietQR hoặc mã thô
  status: 'PENDING' | 'PAID' | 'FAILED' | 'EXPIRED' | 'CANCELLED';
  expiresAt: string;
}