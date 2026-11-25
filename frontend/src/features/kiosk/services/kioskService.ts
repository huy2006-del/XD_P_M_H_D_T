import { publicAxios } from '../../../shared/api/axiosInstance';
import type { MachineSlotDTO, MachineStatusDTO, CreateOrderRequest, OrderResponse } from '../types/kiosk';

interface MachineResponse {
  id: number;
  status: MachineStatusDTO['status'];
  currentTemp?: number | null;
}
interface SlotResponse {
  slotId: number;
  slotCode: string;
  capacity: number;
  currentStock: number;
  status: string;
  productId: number | null;
  productName: string | null;
  productPrice: number | string | null;
  productImageUrl: string | null;
}
interface BackendOrder {
  id: number;
  orderCode: string;
  totalAmount: number | string;
  qrCodeUrl?: string | null;
  paymentStatus: string;
  dispenseStatus: string;
  createdAt: string;
  // [FIX] Hỗ trợ trường expiresAt nếu backend bổ sung trong phản hồi
  expiresAt?: string | null;
  refundVoucherCode?: string | null;
}

// [FIX] Helper ép kiểu số an toàn, tránh phát sinh NaN ra giao diện
const toSafeNumber = (value: number | string | null | undefined, fallback = 0): number => {
  if (value === null || value === undefined || value === '') return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

// [FIX] Chuẩn hóa chuỗi trạng thái về chữ hoa để đồng nhất với KioskSimulator
const normalizeStatus = (value: string | null | undefined, fallback = ''): string =>
  (value ?? fallback).trim().toUpperCase();

// [FIX] Chặn các trạng thái khay hỏng/khóa từ backend thay vì chỉ nhìn tồn kho
const UNAVAILABLE_SLOT_STATUSES = new Set([
  'OUT_OF_STOCK',
  'JAMMED',
  'DISABLED',
  'INACTIVE',
  'MAINTENANCE',
  'OUT_OF_ORDER',
  'ERROR',
  'LOCKED',
]);

const mapOrder = (order: BackendOrder): OrderResponse => {
  const paymentStatus = normalizeStatus(order.paymentStatus);
  const dispenseStatus = normalizeStatus(order.dispenseStatus);

  return {
    orderId: String(order.id),
    orderCode: order.orderCode,
    totalAmount: toSafeNumber(order.totalAmount, 0),
    qrCodeUrl: order.qrCodeUrl ?? '',
    paymentStatus,
    dispenseStatus,
    refundVoucherCode: order.refundVoucherCode ?? null,
    status: paymentStatus,
    expiresAt: order.expiresAt ?? '',
  };
};

export const kioskService = {
  async getMachineStatus(machineId: number): Promise<MachineStatusDTO> {
    const { data } = await publicAxios.get<MachineResponse>(`/api/v1/machines/${machineId}`);
    return {
      machineId: data.id,
      // [FIX] Chuẩn hóa trạng thái máy và ép kiểu nhiệt độ an toàn
      status: normalizeStatus(data.status, 'OFFLINE'),
      temperature: toSafeNumber(data.currentTemp, 0),
    };
  },

  async getMachineSlots(machineId: number): Promise<MachineSlotDTO[]> {
    const { data } = await publicAxios.get<SlotResponse[]>(`/api/v1/machines/${machineId}/slots`);
    return (Array.isArray(data) ? data : []).map((slot) => {
      const price = toSafeNumber(slot.productPrice, 0);
      const currentStock = Math.max(0, toSafeNumber(slot.currentStock, 0));
      const backendSlotStatus = normalizeStatus(slot.status);
      // [FIX] Kết hợp tồn kho, mã sản phẩm và trạng thái vật lý của khay từ backend
      const isAvailable =
        currentStock > 0 &&
        slot.productId != null &&
        !UNAVAILABLE_SLOT_STATUSES.has(backendSlotStatus);

      return {
        slotId: slot.slotId,
        slotCode: slot.slotCode,
        productId: slot.productId,
        productName: slot.productName ?? 'Sản phẩm chưa được gán',
        price,
        productPrice: price,
        capacity: toSafeNumber(slot.capacity, 0),
        currentStock,
        productImageUrl: slot.productImageUrl ?? undefined,
        status: isAvailable ? 'AVAILABLE' : 'OUT_OF_STOCK',
      };
    });
  },

  async createOrder(payload: CreateOrderRequest): Promise<OrderResponse> {
    const { data } = await publicAxios.post<BackendOrder>('/api/v1/orders', {
      machineId: payload.machineId,
      paymentMethod: 'VIETQR',
      items: payload.items.map(({ productId, slotNumber, quantity, unitPrice }) => ({
        productId,
        slotNumber,
        quantity,
        unitPrice,
      })),
    });
    return mapOrder(data);
  },

  async getOrderStatus(orderId: string): Promise<OrderResponse> {
    // [FIX] Mã hóa path param orderId để tránh lỗi URL khi orderId chứa ký tự đặc biệt
    const { data } = await publicAxios.get<BackendOrder>(`/api/v1/orders/${encodeURIComponent(orderId)}`);
    return mapOrder(data);
  },
};
