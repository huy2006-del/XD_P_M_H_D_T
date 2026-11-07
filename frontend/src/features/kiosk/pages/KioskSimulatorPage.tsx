import React, { useState } from 'react';
import { FoodSafetyOverlay } from '../components/FoodSafetyOverlay';
import { useMachineStatus } from '../hooks/useMachineStatus';
import { useKioskInventory } from '../hooks/useKioskInventory';
import { VietQRPaymentModal } from '../components/VietQRPaymentModal';
import { DispensingScreen, JamErrorScreen } from '../components/TransactionResultScreens';
import type { MachineSlot } from '../../slots/slotTypes';
import { useIoTSimulator } from '../hooks/useIoTSimulator';

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

// Hàm chuẩn hóa dữ liệu trả về từ API thành mảng an toàn (không dùng mock data)
const extractSlotsArray = (rawSlots: unknown): ExtendedMachineSlot[] => {
  if (Array.isArray(rawSlots)) {
    return rawSlots as ExtendedMachineSlot[];
  }
  if (rawSlots && typeof rawSlots === 'object') {
    const obj = rawSlots as Record<string, unknown>;
    if (Array.isArray(obj.data)) return obj.data as ExtendedMachineSlot[];
    if (Array.isArray(obj.slots)) return obj.slots as ExtendedMachineSlot[];
    if (Array.isArray(obj.items)) return obj.items as ExtendedMachineSlot[];
    if (Array.isArray(obj.content)) return obj.content as ExtendedMachineSlot[];
  }
  return [];
};

export const KioskSimulatorPage: React.FC<Props> = ({ machineId }) => {
  // --- TÍCH HỢP IOT EDGE SIMULATOR (FE1) ---
  const {
    isOnline,
    setIsOnline,
    temperature,
    setTemperature,
    motorActive,
    offlineBuffer,
    logs,
  } = useIoTSimulator(`MC-0${machineId}`);

  const [showSecretPanel, setShowSecretPanel] = useState<boolean>(true);

  // Lắng nghe trạng thái an toàn thực phẩm (Nhiệm vụ 3.5)
  const { isLocked } = useMachineStatus(machineId);

  // Lấy dữ liệu tồn kho thực tế từ API (Nhiệm vụ 3.6)
  const { slots, loading, error } = useKioskInventory(machineId);

  // Chuẩn hóa dữ liệu thực từ API
  const slotList = extractSlotsArray(slots);
  const isInvalidApiFormat = !loading && !error && typeof slots === 'string';

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
      setFlowState('JAM_ERROR');
    } else {
      setFlowState('DISPENSING');
    }
  };

  // Trở về trạng thái chờ
  const handleReset = () => {
    setFlowState('IDLE');
    setCurrentOrder(null);
  };

  return (
    <div className="flex h-screen bg-gray-200 p-4 gap-4 font-sans overflow-hidden">
      {/* ========================================================= */}
      {/* 1. MÀN HÌNH KIOSK PUBLIC (Dữ liệu thật từ Backend)        */}
      {/* ========================================================= */}
      <div className="flex-1 bg-white rounded-xl shadow-lg border-4 border-gray-800 relative overflow-hidden flex flex-col">
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
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setIsJamSimulated(e.target.checked)}
          />
        </div>

        {/* --- LỚP PHỦ AN TOÀN THỰC PHẨM KHẨN CẤP (Nhiệm vụ 3.5) --- */}
        <FoodSafetyOverlay isLocked={isLocked || !motorActive} />

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
            isLocked || !motorActive || flowState !== 'IDLE'
              ? 'pointer-events-none blur-md select-none opacity-50'
              : ''
          }`}
        >
          <header className="mb-6 flex justify-between items-center border-b pb-4 pr-64">
            <h1 className="text-3xl font-bold text-gray-800">FreshVend Kiosk #{machineId}</h1>
            <div className="flex gap-3">
              <span
                className={`px-3 py-1 rounded-full text-sm font-bold ${
                  isOnline ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}
              >
                {isOnline ? '🟢 MẠNG TỐT' : '🔴 MẤT KẾT NỐI'}
              </span>
              <span
                className={`px-3 py-1 rounded-full text-sm font-bold ${
                  temperature > 10 ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                }`}
              >
                Nhiệt độ: {temperature.toFixed(1)}°C
              </span>
            </div>
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

          {isInvalidApiFormat && (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
              <div className="text-lg font-bold text-red-600 mb-2">
                API đang trả về chuỗi HTML thay vì JSON từ Backend!
              </div>
              <p className="text-sm text-gray-600 max-w-md">
                Hãy kiểm tra lại file <code>useKioskInventory.ts</code> xem đã dùng <code>axiosInstance</code> (trỏ về cổng API Gateway 8080) chưa.
              </p>
            </div>
          )}

          {!loading && !error && !isInvalidApiFormat && slotList.length === 0 && (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-xl text-gray-500">Máy hiện chưa được cấu hình sản phẩm.</div>
            </div>
          )}

          {/* Lưới hiển thị tồn kho thực tế từ Backend (Nhiệm vụ 3.6) */}
          {!loading && !error && slotList.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6 overflow-y-auto pb-20">
              {slotList.map((slot) =>
                slot.productId ? (
                  <div
                    key={slot.slotId || slot.id || slot.slotCode}
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
                ) : null
              )}
            </div>
          )}
        </div>
      </div>

      {/* ========================================================= */}
      {/* 2. SECRET CONTROL PANEL (Khu vực Demo Kỹ thuật & Kafka)   */}
      {/* ========================================================= */}
      {showSecretPanel && (
        <div className="w-[440px] bg-slate-900 text-slate-200 rounded-xl shadow-lg p-6 flex flex-col h-full border border-slate-700 shrink-0">
          <div className="border-b border-slate-700 pb-4 mb-4 flex justify-between items-start">
            <div>
              <h2 className="text-xl font-bold text-yellow-400">🔧 Secret Control Panel</h2>
              <p className="text-xs text-slate-400 mt-1">IoT Edge Simulator • Key: MC-0{machineId}</p>
            </div>
            <button
              onClick={() => setShowSecretPanel(false)}
              className="text-slate-500 hover:text-white"
            >
              ✕
            </button>
          </div>

          <div className="space-y-5 mb-5 flex-shrink-0">
            {/* Thanh trượt nhiệt độ */}
            <div className="bg-slate-800 p-4 rounded-lg">
              <label className="flex justify-between font-bold mb-2">
                <span>Nhiệt độ buồng lạnh:</span>
                <span className={temperature > 10 ? 'text-red-400' : 'text-green-400'}>
                  {temperature.toFixed(1)} °C
                </span>
              </label>
              <input
                type="range"
                min="4"
                max="15"
                step="0.5"
                value={temperature}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTemperature(parseFloat(e.target.value))}
                className="w-full accent-blue-500 cursor-pointer"
              />
              <p className="text-xs text-slate-400 mt-2">
                Gửi cảm biến 5s/lần. Kéo &gt; 10°C khi mất mạng để kích hoạt Watchdog.
              </p>
            </div>

            {/* Nút giả lập rớt mạng */}
            <div className="bg-slate-800 p-4 rounded-lg flex items-center justify-between">
              <div>
                <p className="font-bold">Simulate Network Drop</p>
                <p className="text-xs text-slate-400">Demo Store-and-Forward</p>
              </div>
              <button
                onClick={() => setIsOnline(!isOnline)}
                className={`px-4 py-2 rounded-md font-bold transition ${
                  isOnline
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-green-600 hover:bg-green-700 text-white'
                }`}
              >
                {isOnline ? 'Ngắt kết nối mạng' : 'Khôi phục mạng'}
              </button>
            </div>

            {/* Thông số kỹ thuật nhanh */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-800 p-3 rounded-lg text-center border border-slate-700">
                <p className="text-xs text-slate-400">Hardware Watchdog</p>
                <p className={`font-bold mt-1 ${motorActive ? 'text-green-400' : 'text-red-400 animate-pulse'}`}>
                  {motorActive ? 'ĐANG CHẠY' : 'ĐÃ NGẮT (3s) 🛑'}
                </p>
              </div>
              <div className="bg-slate-800 p-3 rounded-lg text-center border border-slate-700">
                <p className="text-xs text-slate-400">Offline Buffer</p>
                <p className="font-bold mt-1 text-yellow-400">{offlineBuffer.length} gói tin</p>
              </div>
            </div>
          </div>

          {/* Terminal / Logs của Kafka Bridge */}
          <div className="flex-1 bg-black rounded-lg p-3 font-mono text-xs overflow-y-auto border border-slate-700 flex flex-col">
            <h3 className="text-slate-400 mb-2 border-b border-slate-800 pb-2 font-bold flex justify-between">
              <span>&gt; Edge_MQTT_to_Kafka.log</span>
              <span className="text-green-500 animate-pulse">● Rec</span>
            </h3>
            <div className="space-y-1.5 flex-1">
              {logs.map((log, index) => (
                <p
                  key={index}
                  className={`${
                    log.includes('⚠️') || log.includes('🛑')
                      ? 'text-red-400'
                      : log.includes('💾')
                      ? 'text-yellow-400'
                      : log.includes('🚀') || log.includes('🔄')
                      ? 'text-green-400'
                      : 'text-blue-300'
                  }`}
                >
                  {log}
                </p>
              ))}
              {logs.length === 0 && (
                <p className="text-slate-600 italic">Chưa có luồng dữ liệu IoT nào được gửi đi...</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Nút mở lại Secret Panel nếu lỡ tắt */}
      {!showSecretPanel && (
        <button
          onClick={() => setShowSecretPanel(true)}
          className="absolute bottom-4 right-4 bg-slate-900 text-white p-3 rounded-full shadow-xl hover:bg-slate-800 border-2 border-slate-600 z-50"
        >
          🔧
        </button>
      )}
    </div>
  );
};