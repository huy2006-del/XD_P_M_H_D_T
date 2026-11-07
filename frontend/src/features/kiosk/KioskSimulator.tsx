import React, { useState, useEffect, useCallback } from 'react';
import { 
  Building2, 
  ShoppingCart, 
  RefreshCw, 
  Sparkles,
  Maximize,
  Minimize,
  PackageCheck,
  Wrench
} from 'lucide-react';
import type { ProductSlot } from '../../types/kiosk';
import { MOCK_MACHINES, MOCK_INVENTORY_DATA } from '../../constants/kioskMockData';
import { KioskDetailModal } from './components/KioskDetailModal';
import { FoodSafetyOverlay } from './components/FoodSafetyOverlay';
import { useIoTSimulator } from './hooks/useIoTSimulator';

export default function KioskSimulator() {
  // State quản lý máy & kho hàng
  const [selectedMachineId, setSelectedMachineId] = useState<string>('vm-01');
  const [slots, setSlots] = useState<ProductSlot[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // State Modal & Mua hàng FIFO
  const [activeSlot, setActiveSlot] = useState<ProductSlot | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [txStatus, setTxStatus] = useState<'IDLE' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [feedbackMessage, setFeedbackMessage] = useState<string>('');

  // --- TÍCH HỢP IOT EDGE SIMULATOR (FE1) ---
  const kafkaKey = selectedMachineId === 'vm-01' ? 'MC-LANDMARK-01' : `MC-${selectedMachineId.toUpperCase()}`;
  const {
    isOnline,
    setIsOnline,
    temperature,
    setTemperature,
    motorActive,
    offlineBuffer,
    logs,
  } = useIoTSimulator(kafkaKey);

  const [showSecretPanel, setShowSecretPanel] = useState<boolean>(true);

  // Lấy dữ liệu khay hàng theo máy
  const fetchMachineInventory = useCallback(async (machineId: string) => {
    setLoading(true);
    try {
      await new Promise((res) => setTimeout(res, 350));
      setSlots(MOCK_INVENTORY_DATA[machineId] || []);
    } catch (error: unknown) {
      console.error('Lỗi khi tải danh sách khay:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMachineInventory(selectedMachineId);
  }, [selectedMachineId, fetchMachineInventory]);

  // Xử lý Chế độ Toàn màn hình (Mô phỏng Kiosk thực tế)
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Gọi API Trừ kho FIFO (Mô phỏng kết nối với Backend 2)
  const handleConfirmPurchase = async () => {
    if (!activeSlot) return;

    setIsProcessing(true);
    setTxStatus('IDLE');

    try {
      const payload = {
        machineId: selectedMachineId,
        slotId: activeSlot.slotId,
        slotCode: activeSlot.slotCode,
        idempotencyKey: crypto.randomUUID(),
        timestamp: new Date().toISOString()
      };

      console.log('[Kiosk API Request -> BE 2 FIFO Deduct]:', payload);

      await new Promise((res) => setTimeout(res, 1200));

      setSlots((prevSlots) =>
        prevSlots.map((s) =>
          s.slotId === activeSlot.slotId
            ? { ...s, stock: Math.max(0, s.stock - 1) }
            : s
        )
      );

      setTxStatus('SUCCESS');
      setFeedbackMessage(
        `Đã xuất hàng thành công tại khay ${activeSlot.slotCode}! Hệ thống đã ưu tiên trừ lô hàng theo thuật toán FIFO (${activeSlot.batchInfo}).`
      );
    } catch {
      setTxStatus('ERROR');
      setFeedbackMessage('Lỗi giao dịch hoặc khay đã hết hàng trong kho. Vui lòng chọn sản phẩm khác!');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCloseModal = () => {
    setActiveSlot(null);
    setTxStatus('IDLE');
    setFeedbackMessage('');
  };

  const currentMachine = MOCK_MACHINES.find((m) => m.id === selectedMachineId);

  // Điều kiện khóa an toàn thực phẩm: Khi Watchdog đã ngắt motor (mất mạng + nhiệt độ > 10°C sau 3s)
  const isSafetyLocked = !motorActive;

  return (
    <div className="flex h-screen bg-slate-950 text-white font-sans select-none overflow-hidden">
      
      {/* ========================================================= */}
      {/* 1. MÀN HÌNH KIOSK PUBLIC (Bên trái)                       */}
      {/* ========================================================= */}
      <div className="flex-1 flex flex-col justify-between overflow-y-auto relative">
        
        {/* Lớp phủ khóa Kiosk khi Watchdog ngắt motor vì nhiệt độ cao */}
        <FoodSafetyOverlay isLocked={isSafetyLocked} />

        {/* --- KIOSK HEADER --- */}
        <header className="bg-slate-900/90 border-b border-slate-800 p-4 sticky top-0 z-20 backdrop-blur-md flex flex-wrap justify-between items-center gap-4 shadow-xl">
          
          {/* Branding */}
          <div className="flex items-center space-x-3">
            <div className="bg-emerald-500/20 border border-emerald-500/40 p-2.5 rounded-2xl shadow-inner">
              <Sparkles className="w-7 h-7 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-200">
                FRESH KIOSK 24/7
              </h1>
              <p className="text-xs text-slate-400 font-medium">Trạm Trái Cây Tươi Tự Động</p>
            </div>
          </div>

          {/* Dynamic Controls: Badges, Machine Selector & Fullscreen Toggle */}
          <div className="flex items-center space-x-3">
            
            {/* Badge Trạng thái Mạng & Nhiệt độ */}
            <div className="hidden sm:flex items-center space-x-2">
              <span
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border ${
                  isOnline
                    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                    : 'bg-red-500/15 text-red-400 border-red-500/30 animate-pulse'
                }`}
              >
                {isOnline ? '🟢 4G ONLINE' : '🔴 OFFLINE'}
              </span>
              <span
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border ${
                  temperature > 10
                    ? 'bg-red-500/15 text-red-400 border-red-500/30 animate-pulse'
                    : 'bg-sky-500/15 text-sky-400 border-sky-500/30'
                }`}
              >
                ❄️ {temperature.toFixed(1)}°C
              </span>
            </div>

            {/* Machine Dropdown */}
            <div className="flex items-center bg-slate-800 border border-slate-700 rounded-2xl px-3 py-1.5 focus-within:ring-2 focus-within:ring-emerald-500 transition">
              <Building2 className="w-5 h-5 text-emerald-400 mr-2 shrink-0" />
              <div className="flex flex-col">
                <span className="text-[9px] text-slate-400 uppercase tracking-widest font-bold">Mô phỏng Kiosk</span>
                <select
                  value={selectedMachineId}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedMachineId(e.target.value)}
                  className="bg-transparent text-sm font-bold text-white focus:outline-none cursor-pointer pr-1"
                >
                  {MOCK_MACHINES.map((m) => (
                    <option key={m.id} value={m.id} className="bg-slate-900 text-white">
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Fullscreen Button */}
            <button
              onClick={toggleFullscreen}
              className="p-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-2xl transition text-slate-300 hover:text-white"
              title="Chế độ Fullscreen Kiosk"
            >
              {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
            </button>

            {/* Nút Bật/Tắt Secret Control Panel */}
            <button
              onClick={() => setShowSecretPanel(!showSecretPanel)}
              className={`p-3 border rounded-2xl transition ${
                showSecretPanel
                  ? 'bg-amber-500/20 border-amber-500/50 text-amber-400'
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
              }`}
              title="Bật/Tắt Secret Control Panel (FE1)"
            >
              <Wrench className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* --- KIOSK MAIN INVENTORY GRID --- */}
        <main
          className={`flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full transition-all duration-300 ${
            isSafetyLocked ? 'pointer-events-none blur-md opacity-40' : ''
          }`}
        >
          {/* Top Status Banner */}
          <div className="mb-6 bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex justify-between items-center shadow-md">
            <div className="flex items-center space-x-2 text-sm text-slate-300">
              <PackageCheck className="w-5 h-5 text-emerald-400" />
              <span>Vị trí hiện tại: <strong className="text-white">{currentMachine?.location}</strong></span>
            </div>
            <button
              onClick={() => fetchMachineInventory(selectedMachineId)}
              className="flex items-center space-x-2 text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>Làm mới danh mục</span>
            </button>
          </div>

          {/* Slot Grid View */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 space-y-4">
              <RefreshCw className="w-12 h-12 text-emerald-400 animate-spin" />
              <p className="text-slate-400 font-medium tracking-wide">Đang đồng bộ dữ liệu khay hàng...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {slots.map((slot) => {
                const isOutOfStock = slot.stock <= 0;
                return (
                  <div
                    key={slot.slotId}
                    className={`relative bg-slate-900/80 rounded-3xl border transition-all duration-300 flex flex-col justify-between overflow-hidden shadow-2xl ${
                      isOutOfStock
                        ? 'border-slate-800/80 opacity-60'
                        : 'border-slate-800 hover:border-emerald-500/50 hover:scale-[1.02]'
                    }`}
                  >
                    {/* Slot Code Badge (A1, A2...) */}
                    <div className="absolute top-4 left-4 bg-slate-950/80 border border-slate-700 px-3.5 py-1 rounded-full text-xs font-black text-emerald-400 z-10 backdrop-blur-sm">
                      Khay {slot.slotCode}
                    </div>

                    {/* Stock Tag */}
                    <div className="absolute top-4 right-4 bg-slate-950/80 border border-slate-700 px-3 py-1 rounded-full text-xs font-bold text-slate-300 z-10 backdrop-blur-sm">
                      Tồn: <span className={isOutOfStock ? 'text-red-400' : 'text-emerald-400'}>{slot.stock}</span>
                    </div>

                    {/* Image Container */}
                    <div className="relative h-48 w-full bg-slate-950 overflow-hidden flex items-center justify-center">
                      <img
                        src={slot.imageUrl}
                        alt={slot.productName}
                        className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
                        loading="lazy"
                      />
                      {isOutOfStock && (
                        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center">
                          <span className="bg-red-500/20 text-red-400 border border-red-500/40 px-5 py-2 rounded-2xl text-sm font-black tracking-widest uppercase">
                            HẾT HÀNG
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Card Footer Content */}
                    <div className="p-5 flex flex-col flex-1 justify-between space-y-4">
                      <div>
                        <h3 className="text-lg font-black text-white tracking-wide">{slot.productName}</h3>
                        <p className="text-xl font-black text-emerald-400 mt-1">
                          {slot.price.toLocaleString('vi-VN')} <span className="text-xs font-normal">VNĐ</span>
                        </p>
                      </div>

                      {/* Touch Button */}
                      <button
                        disabled={isOutOfStock}
                        onClick={() => {
                          setActiveSlot(slot);
                          setTxStatus('IDLE');
                        }}
                        className={`w-full py-3.5 rounded-2xl font-black text-sm tracking-wider transition-all flex items-center justify-center space-x-2 active:scale-95 ${
                          isOutOfStock
                            ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                            : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/20 cursor-pointer'
                        }`}
                      >
                        <ShoppingCart className="w-4 h-4" />
                        <span>CHỌN MUA</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>

        {/* --- KIOSK FOOTER --- */}
        <footer className="p-4 text-center text-xs text-slate-500 border-t border-slate-900 bg-slate-950">
          Mô phỏng giao diện màn hình cảm ứng Kiosk Bán Trái Cây Tự Động • Đáp ứng chuẩn tương tác FIFO &amp; IoT Edge
        </footer>

        {/* --- MODAL POPUP: CHI TIẾT & XÁC NHẬN MUA --- */}
        {activeSlot && (
          <KioskDetailModal
            activeSlot={activeSlot}
            txStatus={txStatus}
            feedbackMessage={feedbackMessage}
            isProcessing={isProcessing}
            onClose={handleCloseModal}
            onConfirm={handleConfirmPurchase}
          />
        )}
      </div>

      {/* ========================================================= */}
      {/* 2. SECRET CONTROL PANEL (Bên phải - Demo FE1)             */}
      {/* ========================================================= */}
      {showSecretPanel && (
        <aside className="w-[420px] bg-slate-900 border-l-2 border-slate-800 p-5 flex flex-col h-full shrink-0 shadow-2xl z-30">
          <div className="border-b border-slate-800 pb-3 mb-4 flex justify-between items-start">
            <div>
              <h2 className="text-lg font-bold text-amber-400 flex items-center gap-2">
                <span>🔧 Secret Control Panel</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                IoT Edge Simulator • Key: <strong className="text-emerald-400">{kafkaKey}</strong>
              </p>
            </div>
            <button
              onClick={() => setShowSecretPanel(false)}
              className="text-slate-400 hover:text-white px-2 py-1 rounded-lg hover:bg-slate-800"
            >
              ✕
            </button>
          </div>

          <div className="space-y-4 mb-4 flex-shrink-0">
            {/* Thanh trượt nhiệt độ (4°C -> 15°C) */}
            <div className="bg-slate-800/80 p-4 rounded-2xl border border-slate-700/80">
              <label className="flex justify-between font-bold text-sm mb-2">
                <span>Nhiệt độ buồng lạnh:</span>
                <span className={temperature > 10 ? 'text-red-400 font-black' : 'text-emerald-400 font-black'}>
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
                className="w-full accent-emerald-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                <span>4°C (Chuẩn)</span>
                <span>10°C (Ngưỡng)</span>
                <span>15°C (Nguy hiểm)</span>
              </div>
            </div>

            {/* Nút gạt Ngắt kết nối mạng (Simulate Network Drop) */}
            <div className="bg-slate-800/80 p-4 rounded-2xl border border-slate-700/80 flex items-center justify-between">
              <div>
                <p className="font-bold text-sm">Simulate Network Drop</p>
                <p className="text-xs text-slate-400">Cơ chế Store-and-Forward</p>
              </div>
              <button
                onClick={() => setIsOnline(!isOnline)}
                className={`px-4 py-2 rounded-xl text-xs font-black transition shadow-lg ${
                  isOnline
                    ? 'bg-red-600 hover:bg-red-500 text-white'
                    : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                }`}
              >
                {isOnline ? 'Ngắt kết nối mạng' : 'Khôi phục mạng'}
              </button>
            </div>

            {/* Trạng thái Watchdog & Bộ nhớ đệm */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-800/80 p-3 rounded-2xl text-center border border-slate-700/80">
                <p className="text-[11px] text-slate-400">Hardware Watchdog</p>
                <p className={`font-black text-xs mt-1 ${motorActive ? 'text-emerald-400' : 'text-red-400 animate-pulse'}`}>
                  {motorActive ? 'MOTOR CHẠY' : 'ĐÃ NGẮT (3s) 🛑'}
                </p>
              </div>
              <div className="bg-slate-800/80 p-3 rounded-2xl text-center border border-slate-700/80">
                <p className="text-[11px] text-slate-400">Store &amp; Forward Buffer</p>
                <p className="font-black text-xs mt-1 text-amber-400">{offlineBuffer.length} gói lưu thẻ nhớ</p>
              </div>
            </div>
          </div>

          {/* Terminal / Logs của MQTT -> Kafka Bridge */}
          <div className="flex-1 bg-slate-950 rounded-2xl p-3.5 font-mono text-xs overflow-y-auto border border-slate-800 flex flex-col">
            <h3 className="text-slate-400 mb-2 border-b border-slate-800 pb-2 font-bold flex justify-between items-center">
              <span>&gt; MQTT_to_Kafka_Bridge.log</span>
              <span className="text-emerald-400 animate-pulse text-[10px]">● 5s/tick</span>
            </h3>
            <div className="space-y-1.5 flex-1">
              {logs.map((log, index) => (
                <p
                  key={index}
                  className={`leading-relaxed ${
                    log.includes('⚠️') || log.includes('🛑')
                      ? 'text-red-400 font-semibold'
                      : log.includes('💾')
                      ? 'text-amber-300'
                      : log.includes('🚀') || log.includes('🔄')
                      ? 'text-emerald-400 font-semibold'
                      : 'text-sky-300'
                  }`}
                >
                  {log}
                </p>
              ))}
              {logs.length === 0 && (
                <p className="text-slate-600 italic">Đang thu thập cảm biến chu kỳ 5s/lần...</p>
              )}
            </div>
          </div>
        </aside>
      )}
    </div>
  );
}