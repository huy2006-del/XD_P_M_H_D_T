import React, { useState } from 'react';
import { FoodSafetyOverlay } from '../components/FoodSafetyOverlay';
import { useMachineStatus } from '../hooks/useMachineStatus';
import { useKioskInventory } from '../hooks/useKioskInventory';
import { VietQRPaymentModal } from '../components/VietQRPaymentModal';
import { DispensingScreen, JamErrorScreen } from '../components/TransactionResultScreens';
import type { MachineSlot } from '../../slots/slotTypes';

// 1. Mở rộng kiểu dữ liệu MachineSlot để khai báo các trường tùy chọn mà không dùng kiểu 'any'
interface ExtendedMachineSlot extends MachineSlot {
  id?: number;
  price?: number;
}

interface Props {
  machineId: number;
}

type KioskFlowState = 'IDLE' | 'PAYING' | 'DISPENSING' | 'JAM_ERROR';

interface CurrentOrder {
  id: string;
  amount: number;
  content: string;
  slotCode: string;
}

// 2. Định nghĩa hàm sinh Order ID BÊN NGOÀI Component để tuân thủ luật Pure Function của React
const generateOrderId = (): string => {
  const uniqueTimeId = String(Date.now()).slice(-6);
  return `ORD${uniqueTimeId}`;
};

export const KioskSimulatorPage: React.FC<Props> = ({ machineId }) => {
  // Lắng nghe trạng thái an toàn thực phẩm (Nhiệm vụ 3.5)
  const { isLocked } = useMachineStatus(machineId);

  // Lấy dữ liệu tồn kho thực tế từ API (Nhiệm vụ 3.6)
  const { slots, loading, error } = useKioskInventory(machineId);

  // Quản lý trạng thái luồng mua hàng (Nhiệm vụ 5.9)
  const [flowState, setFlowState] = useState<KioskFlowState>('IDLE');
  const [currentOrder, setCurrentOrder] = useState<CurrentOrder | null>(null);

  // Cờ giả lập kẹt hàng (Nhiệm vụ 5.10)
  const [isJamSimulated, setIsJamSimulated] = useState<boolean>(false);

  // Xử lý khi khách hàng bấm chọn mua
  const handleBuyClick = (slot: ExtendedMachineSlot) => {
    const orderId = generateOrderId();
    const price = slot.price ?? 15000;

    setCurrentOrder({
      id: orderId,
      amount: price,
      content: `${orderId} KHAY ${slot.slotCode}`,
      slotCode: slot.slotCode,
    });

    setFlowState('PAYING');
  };

  // Xử lý khi Polling/WebSocket xác nhận thanh toán thành công
  const handlePaymentSuccess = () => {
    if (isJamSimulated) {
      setFlowState('JAM_ERROR'); // Hiện màn hình kẹt hàng nếu bật công tắc Demo
    } else {
      setFlowState('DISPENSING'); // Hiện màn hình nhả hàng bình thường
    }
  };

  // Trở về trạng thái chờ
  const handleReset = () => {
    setFlowState('IDLE');
    setCurrentOrder(null);
  };

  return (
    <div className="relative w-full h-screen bg-gray-50 overflow-hidden font-sans">
      {/* --- CÔNG TẮC GIẢ LẬP KẸT HÀNG (Nhiệm vụ 5.10) --- */}
      <div className="absolute top-4 right-4 z-40 bg-white/90 backdrop-blur-sm p-3 rounded-xl shadow-lg border border-red-200 flex items-center gap-3">
        <label htmlFor="jam-toggle" className="text-sm font-bold text-red-600 cursor-pointer select-none">
          🚨 Bật giả lập kẹt hàng (Demo)
        </label>
        <input
          id="jam-toggle"
          type="checkbox"
          className="w-5 h-5 accent-red-600 cursor-pointer"
          checked={isJamSimulated}
          onChange={(e) => setIsJamSimulated(e.target.checked)}
        />
      </div>

      {/* --- LỚP PHỦ AN TOÀN THỰC PHẨM KHẨN CẤP (Nhiệm vụ 3.5) --- */}
      <FoodSafetyOverlay isLocked={isLocked} />

      {/* --- MODAL THANH TOÁN VIETQR (Nhiệm vụ 5.9) --- */}
      {flowState === 'PAYING' && currentOrder && (
        <VietQRPaymentModal
          orderId={currentOrder.id}
          amount={currentOrder.amount}
          content={currentOrder.content}
          onPaid={handlePaymentSuccess}
          onCancel={handleReset}
        />
      )}

      {/* --- MÀN HÌNH ĐANG NHẢ HÀNG (Nhiệm vụ 5.9) --- */}
      {flowState === 'DISPENSING' && currentOrder && (
        <DispensingScreen slotCode={currentOrder.slotCode} onFinish={handleReset} />
      )}

      {/* --- MÀN HÌNH LỖI KẸT HÀNG & REFUND VOUCHER (Nhiệm vụ 5.10) --- */}
      {flowState === 'JAM_ERROR' && <JamErrorScreen onFinish={handleReset} />}

      {/* --- GIAO DIỆN CHỌN MÓN KIOSK --- */}
      <div
        className={`h-full w-full flex flex-col p-6 transition-all duration-300 ${
          isLocked || flowState !== 'IDLE' ? 'pointer-events-none blur-md select-none opacity-50' : ''
        }`}
      >
        <header className="mb-6 text-center">
          <h1 className="text-3xl font-bold text-gray-800">FreshVend Kiosk #{machineId}</h1>
        </header>

        {loading && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-xl text-gray-500 animate-pulse">Đang đồng bộ dữ liệu kho...</div>
          </div>
        )}

        {error && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-xl text-red-500">{error}</div>
          </div>
        )}

        {!loading && !error && slots.length === 0 && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-xl text-gray-500">Máy hiện chưa được cấu hình sản phẩm.</div>
          </div>
        )}

        {/* Lưới hiển thị tồn kho thực tế (Nhiệm vụ 3.6) */}
        {!loading && !error && slots.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 overflow-y-auto pb-20">
            {slots.map((slotItem) => {
              const slot = slotItem as ExtendedMachineSlot;
              return slot.productId ? (
                <div
                  key={slot.slotId || slot.id}
                  className={`bg-white rounded-xl shadow-md p-4 border-2 transition-all ${
                    slot.currentStock > 0 ? 'border-transparent hover:shadow-lg' : 'border-gray-200 opacity-60'
                  }`}
                >
                  <div className="text-sm text-gray-400 mb-2 font-mono">{slot.slotCode}</div>
                  <h3 className="font-bold text-lg mb-1 truncate">{slot.productName || 'Sản phẩm'}</h3>
                  <div className="text-blue-600 font-semibold mb-3">
                    {(slot.price ?? 15000).toLocaleString('vi-VN')} đ
                  </div>

                  {slot.currentStock > 0 ? (
                    <button
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-colors active:scale-95 shadow"
                      onClick={() => handleBuyClick(slot)}
                    >
                      Chọn Mua
                    </button>
                  ) : (
                    <button className="w-full bg-gray-200 text-gray-500 font-bold py-3 rounded-lg cursor-not-allowed">
                      Hết Hàng
                    </button>
                  )}
                </div>
              ) : null;
            })}
          </div>
        )}
      </div>
    </div>
  );
};
