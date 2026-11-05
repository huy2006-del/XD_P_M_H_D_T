import axios from 'axios';
import type { MachineSlot } from '../../slots/slotTypes';

export interface MachineStatusResponse {
  id: number;
  status: 'ACTIVE' | 'OUT_OF_ORDER' | 'MAINTENANCE';
  temperature?: number;
}

export const kioskService = {
  // 1. Lấy trạng thái máy (Nhiệm vụ 3.5)
  getMachineStatus: async (machineId: number): Promise<MachineStatusResponse> => {
    const response = await axios.get(`/api/v1/machines/${machineId}/status`);
    return response.data;
  },

  // 2. Lấy danh sách khay hàng thực tế (Nhiệm vụ 3.6)
  getMachineSlots: async (machineId: number): Promise<MachineSlot[]> => {
    const response = await axios.get(`/api/v1/machines/${machineId}/slots`);
    return response.data;
  },

  // 3. Kiểm tra trạng thái thanh toán (Nhiệm vụ 5.9)
  checkPaymentStatus: async (orderId: string): Promise<{ status: 'PENDING' | 'PAID' | 'FAILED' }> => {
    // Sử dụng orderId để in log debug nhằm tránh lỗi ts(6133) unused variable
    console.log(`Checking payment status for order: ${orderId}`);

    // GIẢ LẬP DEMO FE: Tự động báo PAID sau khi Polling
    return new Promise((resolve) => {
      setTimeout(() => resolve({ status: 'PAID' }), 5000);
    });

    // KHI CÓ API THẬT TỪ BACKEND, BỎ COMMENT ĐOẠN DƯỚI:
    // const response = await axios.get(`/api/v1/orders/${orderId}/payment-status`);
    // return response.data;
  }
};
