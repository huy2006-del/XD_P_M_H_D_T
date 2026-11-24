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
  refundVoucherCode?: string | null;
}

const mapOrder = (order: BackendOrder): OrderResponse => ({
  orderId: String(order.id),
  orderCode: order.orderCode,
  totalAmount: Number(order.totalAmount),
  qrCodeUrl: order.qrCodeUrl ?? '',
  paymentStatus: order.paymentStatus,
  dispenseStatus: order.dispenseStatus,
  refundVoucherCode: order.refundVoucherCode,
  status: order.paymentStatus,
  expiresAt: '',
});

export const kioskService = {
  async getMachineStatus(machineId: number): Promise<MachineStatusDTO> {
    const { data } = await publicAxios.get<MachineResponse>(`/api/v1/machines/${machineId}`);
    return { machineId: data.id, status: data.status, temperature: Number(data.currentTemp ?? 0) };
  },

  async getMachineSlots(machineId: number): Promise<MachineSlotDTO[]> {
    const { data } = await publicAxios.get<SlotResponse[]>(`/api/v1/machines/${machineId}/slots`);
    return (Array.isArray(data) ? data : []).map((slot) => ({
      slotId: slot.slotId,
      slotCode: slot.slotCode,
      productId: slot.productId,
      productName: slot.productName ?? 'Sản phẩm chưa được gán',
      price: Number(slot.productPrice ?? 0),
      productPrice: Number(slot.productPrice ?? 0),
      capacity: slot.capacity,
      currentStock: slot.currentStock,
      productImageUrl: slot.productImageUrl ?? undefined,
      status: slot.currentStock > 0 && slot.productId != null ? 'AVAILABLE' : 'OUT_OF_STOCK',
    }));
  },

  async createOrder(payload: CreateOrderRequest): Promise<OrderResponse> {
    const { data } = await publicAxios.post<BackendOrder>('/api/v1/orders', {
      machineId: payload.machineId,
      paymentMethod: 'VIETQR',
      items: payload.items.map(({ productId, slotNumber, quantity, unitPrice }) => ({ productId, slotNumber, quantity, unitPrice })),
    });
    return mapOrder(data);
  },

  async getOrderStatus(orderId: string): Promise<OrderResponse> {
    const { data } = await publicAxios.get<BackendOrder>(`/api/v1/orders/${orderId}`);
    return mapOrder(data);
  },
};
