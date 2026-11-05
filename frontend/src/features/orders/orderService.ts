import { axiosInstance } from '../../shared/api/axiosInstance';

export type OrderStatus = 'SUCCESS' | 'PENDING_PAYMENT' | 'REFUNDED_JAMMED';

export interface Order {
  id: number;
  orderCode: string;
  machineId: number;
  machineName: string;
  productName: string;
  amount: number;
  status: OrderStatus;
  createdAt: string;
}

export interface OrderFilterParams {
  date?: string;
  machineId?: string;
  status?: string;
}

export const orderService = {
  getOrders: async (params?: OrderFilterParams) => {
    const response = await axiosInstance.get<Order[]>('/api/v1/orders', { params });
    return response.data;
  },
};