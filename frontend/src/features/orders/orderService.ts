import { axiosInstance } from '../../shared/api/axiosInstance';

export type OrderStatus = 'SUCCESS' | 'PENDING_PAYMENT' | 'REFUNDED_JAMMED' | 'PAYMENT_FAILED' | 'DISPENSING';
export interface Order {
  id: number;
  orderCode: string;
  machineId: number;
  machineName: string;
  productName: string;
  amount: number;
  status: OrderStatus;
  refundVoucherCode?: string | null;
  createdAt: string;
}
export interface OrderFilterParams { date?: string; machineId?: string; status?: string; }

interface OrderDto {
  id: number;
  orderCode: string;
  machineId: number;
  totalAmount: number | string;
  paymentStatus: string;
  dispenseStatus: string;
  refundVoucherCode?: string | null;
  createdAt: string;
  items?: Array<{ productId: number; quantity: number }>;
}

function toOrder(dto: OrderDto): Order {
  let status: OrderStatus = 'PENDING_PAYMENT';
  if (dto.dispenseStatus === 'JAMMED' || dto.dispenseStatus === 'REFUNDED') status = 'REFUNDED_JAMMED';
  else if (dto.paymentStatus === 'FAILED') status = 'PAYMENT_FAILED';
  else if (dto.dispenseStatus === 'COMPLETED' || dto.dispenseStatus === 'DISPENSED') status = 'SUCCESS';
  else if (dto.paymentStatus === 'SUCCESS') status = 'DISPENSING';
  return {
    id: dto.id,
    orderCode: dto.orderCode,
    machineId: dto.machineId,
    machineName: `Máy #${dto.machineId}`,
    productName: (dto.items ?? []).map((item) => `SP #${item.productId} × ${item.quantity}`).join(', ') || '—',
    amount: Number(dto.totalAmount),
    status,
    refundVoucherCode: dto.refundVoucherCode ?? null,
    createdAt: dto.createdAt,
  };
}

export const orderService = {
  async getOrders(params?: OrderFilterParams): Promise<Order[]> {
    const { data } = await axiosInstance.get<OrderDto[]>('/api/v1/orders');
    let orders = (Array.isArray(data) ? data : []).map(toOrder);
    if (params?.date) orders = orders.filter((o) => o.createdAt.slice(0, 10) === params.date);
    if (params?.machineId) {
      const normalizedMachineFilter = params.machineId.replace(/^#/, '').trim();
      if (normalizedMachineFilter) {
        orders = orders.filter((o) => String(o.machineId).includes(normalizedMachineFilter));
      }
    }
    if (params?.status) orders = orders.filter((o) => o.status === params.status);
    return orders;
  },
};
