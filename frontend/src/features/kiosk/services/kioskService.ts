import { publicAxios } from '../../../shared/api/axiosInstance';
import type { 
  MachineSlotDTO, 
  MachineStatusDTO, 
  CreateOrderRequest, 
  OrderResponse 
} from '../types/kiosk';

export const kioskService = {
  // Lấy trạng thái máy thời gian thực
  getMachineStatus: async (machineId: number): Promise<MachineStatusDTO> => {
    const response = await publicAxios.get(`/api/v1/machines/${machineId}/status`);
    return response.data;
  },

  // Lấy danh sách tồn kho thực tế
  getMachineSlots: async (machineId: number): Promise<MachineSlotDTO[]> => {
    const response = await publicAxios.get(`/api/v1/machines/${machineId}/slots`);
    return response.data;
  },

  // Tạo đơn hàng (Bắt đầu luồng giao dịch)
  createOrder: async (payload: CreateOrderRequest): Promise<OrderResponse> => {
    const response = await publicAxios.post('/api/v1/orders', payload);
    return response.data;
  },

  // Hủy đơn hàng khi timeout
  cancelOrder: async (orderId: string): Promise<void> => {
    await publicAxios.put(`/api/v1/orders/${orderId}/cancel`);
  },

  // Polling dự phòng khi rớt WebSocket
  getOrderStatus: async (orderId: string): Promise<{ status: string }> => {
    const response = await publicAxios.get(`/api/v1/orders/${orderId}/status`);
    return response.data;
  }
};
