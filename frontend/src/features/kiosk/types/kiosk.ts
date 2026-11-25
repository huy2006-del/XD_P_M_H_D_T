// [FIX] Chuẩn hóa các kiểu trạng thái (dùng string & {} để giữ gợi ý IDE nhưng không lỗi nếu BE thêm trạng thái mới)
export type MachineOperatingStatus =
  | 'ONLINE'
  | 'OFFLINE'
  | 'MAINTENANCE'
  | 'OUT_OF_ORDER'
  | 'ERROR'
  | (string & {});

export type SlotStatus = 'AVAILABLE' | 'OUT_OF_STOCK';

export type OrderPaymentStatus =
  | 'PENDING'
  | 'SUCCESS'
  | 'FAILED'
  | 'EXPIRED'
  | (string & {});

export type OrderDispenseStatus =
  | 'PENDING'
  | 'DISPENSING'
  | 'COMPLETED'
  | 'JAMMED'
  | (string & {});

// 1. DTO Trạng thái máy
export interface MachineStatusDTO {
  machineId: number;
  status: MachineOperatingStatus;
  temperature: number;
}

// 2. DTO Khay hàng (Nhận từ GET /slots)
export interface MachineSlotDTO {
  slotId: number;
  slotCode: string;
  productName: string;
  productId?: number | null;
  price: number;
  productPrice?: number;
  capacity?: number;
  currentStock: number;
  productImageUrl?: string;
  status: SlotStatus;
}

// 3. DTO Tạo đơn hàng (Gửi POST /orders)
export interface OrderItemRequest {
  slotId: number;
  quantity: number;
}

// [FIX] Tách riêng interface cho từng dòng sản phẩm khi tạo đơn để tái sử dụng rõ ràng
export interface CreateOrderItemRequest {
  slotId: number;
  productId: number;
  slotNumber: number;
  quantity: number;
  unitPrice: number;
}

export interface CreateOrderRequest {
  machineId: number;
  items: CreateOrderItemRequest[];
}

// 4. DTO Phản hồi tạo đơn
export interface OrderResponse {
  orderId: string;
  orderCode: string;
  totalAmount: number;
  qrCodeUrl: string; // Link VietQR hoặc mã thô
  status: OrderPaymentStatus;
  paymentStatus: OrderPaymentStatus;
  dispenseStatus: OrderDispenseStatus;
  refundVoucherCode?: string | null;
  expiresAt: string;
}
