import { useState, useEffect, useCallback, useRef } from 'react';
import { ShoppingCart, X, CheckCircle, RefreshCw, Search, Plus, Minus, Trash2, Tag, CreditCard, PackageOpen, Maximize2, Minimize2, Wifi, WifiOff } from 'lucide-react';
import { toast } from 'sonner';
import { kioskService, type MachineSummaryDTO } from './services/kioskService';
import type { MachineSlotDTO, OrderResponse, MachineStatusDTO, CreateOrderRequest } from './types/kiosk';
import { useWebSocketSubscription } from '../../shared/realtime/useWebSocketSubscription';
import { FoodSafetyOverlay } from './components/FoodSafetyOverlay';

interface Props {
  machineId?: number;
}

const POS_CATEGORIES = ['Trái cây'];
const FALLBACK_PRODUCT_IMAGE =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 200 200'%3E%3Crect width='200' height='200' fill='%23f3f4f6'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%239ca3af' font-family='sans-serif' font-size='16'%3EFreshVend%3C/text%3E%3C/svg%3E";

export default function KioskSimulator({ machineId: initialMachineId = 1 }: Props) {
  // --- STATE DỮ LIỆU ---
  const [selectedMachineId, setSelectedMachineId] = useState<number>(initialMachineId);
  const [machines, setMachines] = useState<MachineSummaryDTO[]>([]);
  const [machineStatus, setMachineStatus] = useState<MachineStatusDTO | null>(null);
  const [slots, setSlots] = useState<MachineSlotDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  
  // --- STATE UI & TÌM KIẾM ---
  const [activeCategory, setActiveCategory] = useState('Trái cây');
  const [searchQuery, setSearchQuery] = useState('');
  const [simulateJam, setSimulateJam] = useState(false);
  const [simulatingPayment, setSimulatingPayment] = useState(false);
  
  // --- STATE GIỎ HÀNG ---
  // [FIX] Khai báo rõ generic Map<number, number> để đảm bảo an toàn kiểu TypeScript
  const [cart, setCart] = useState<Map<number, number>>(() => new Map());
  const [isProcessing, setIsProcessing] = useState(false);
  
  // --- STATE THANH TOÁN & HOÀN TẤT ---
  const [currentOrder, setCurrentOrder] = useState<OrderResponse | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<'IDLE' | 'PENDING' | 'SUCCESS' | 'FAILED' | 'EXPIRED' | 'DISPENSING' | 'JAMMED'>('IDLE');
  const [paymentWebhookSent, setPaymentWebhookSent] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const [timeLeft, setTimeLeft] = useState<number>(60);
  const [resetTimer, setResetTimer] = useState<number>(5);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const resetTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const paymentStatusRef = useRef(paymentStatus);
  const processedDispenseOrderRef = useRef<string | null>(null);

  useEffect(() => {
    paymentStatusRef.current = paymentStatus;
  }, [paymentStatus]);

  useEffect(() => {
    const onFullscreenChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      toast.error('Trình duyệt không hỗ trợ chế độ toàn màn hình.');
    }
  };

  // 1. Tải dữ liệu máy và hàng hóa
  const fetchMachineData = useCallback(async () => {
    setLoading(true);
    setConnectionError(null);
    try {
      const [machineList, statusData, slotsData] = await Promise.all([
        kioskService.getMachines().catch(() => []),
        kioskService.getMachineStatus(selectedMachineId),
        kioskService.getMachineSlots(selectedMachineId)
      ]);
      setMachines(machineList);
      setMachineStatus(statusData);
      setSlots(slotsData);
    } catch (error: unknown) {
      console.error('Lỗi kết nối Server:', error);
      setConnectionError('Không thể kết nối tới máy chủ FreshVend. Vui lòng kiểm tra API Gateway (cổng 8080).');
      setMachineStatus(null);
      setSlots([]);
    } finally {
      setLoading(false);
    }
  }, [selectedMachineId]);

  useEffect(() => { fetchMachineData(); }, [fetchMachineData]);

  // Lắng nghe WebSocket Telemetry & Cảnh báo để cập nhật nhiệt độ và khóa an toàn thực phẩm tức thì
  useWebSocketSubscription<{ temperature?: number }>(`/topic/telemetry/${selectedMachineId}`, (telemetry) => {
    if (typeof telemetry?.temperature === 'number') {
      setMachineStatus((prev) => prev ? { ...prev, temperature: telemetry.temperature! } : prev);
    }
  });

  useWebSocketSubscription<{ machineId?: number; severity?: string; status?: string }>('/topic/alerts', (alert) => {
    if (alert?.machineId === selectedMachineId) {
      void kioskService.getMachineStatus(selectedMachineId).then(setMachineStatus).catch(() => {});
    }
  });

  const dispenseWs = useWebSocketSubscription<{ orderId?: string; status?: string; refundVoucherCode?: string | null }>(
    `/topic/dispense/${selectedMachineId}`,
    (notification) => {
      if (!currentOrder || !notification) return;
      if (notification.orderId !== currentOrder.orderCode && notification.orderId !== currentOrder.orderId) return;

      // Chống xử lý event dispense trùng lặp khi đơn đã ở trạng thái cuối
      const currentState = paymentStatusRef.current;
      if (currentState === 'DISPENSING' || currentState === 'JAMMED') return;

      const orderKey = currentOrder.orderCode || currentOrder.orderId;
      if (notification.status === 'JAMMED') {
        processedDispenseOrderRef.current = orderKey;
        setCurrentOrder((prev) => prev ? { ...prev, dispenseStatus: 'JAMMED', refundVoucherCode: notification.refundVoucherCode ?? prev.refundVoucherCode } : prev);
        setPaymentStatus('JAMMED');
      } else if (notification.status === 'DISPENSED' || notification.status === 'COMPLETED') {
        // Không cho phép dispense trước khi backend xác nhận thanh toán thành công
        if (currentOrder.paymentStatus !== 'SUCCESS' && currentState !== 'SUCCESS') {
          void kioskService.getOrderStatus(currentOrder.orderId).then((latest) => {
            setCurrentOrder(latest);
            if (latest.paymentStatus === 'SUCCESS' && (latest.dispenseStatus === 'DISPENSED' || latest.dispenseStatus === 'COMPLETED')) {
              processedDispenseOrderRef.current = orderKey;
              setResetTimer(5);
              setPaymentStatus('DISPENSING');
            }
          }).catch(() => {});
          return;
        }
        if (processedDispenseOrderRef.current === orderKey) return;
        processedDispenseOrderRef.current = orderKey;
        setResetTimer(5);
        setPaymentStatus('DISPENSING');
      }
    }
  );

  // 2. NGHIỆP VỤ GIỎ HÀNG
  const handleAddToCart = (slot: MachineSlotDTO) => {
    if (slot.currentStock <= 0 || slot.status === 'OUT_OF_STOCK') return;
    setCart((prev) => {
      const newCart = new Map(prev);
      const currentQty = newCart.get(slot.slotId) ?? 0;
      if (currentQty < slot.currentStock) newCart.set(slot.slotId, currentQty + 1);
      return newCart;
    });
  };

  const handleDecreaseQty = (slotId: number) => {
    setCart((prev) => {
      const newCart = new Map(prev);
      const currentQty = newCart.get(slotId) ?? 0;
      if (currentQty > 1) newCart.set(slotId, currentQty - 1);
      else newCart.delete(slotId);
      return newCart;
    });
  };

  const handleRemoveItem = (slotId: number) => {
    setCart((prev) => {
      const newCart = new Map(prev);
      newCart.delete(slotId);
      return newCart;
    });
  };

  const totalAmount = [...cart.entries()].reduce((sum, [slotId, qty]) => {
    const slot = slots.find(s => s.slotId === slotId);
    return sum + (slot ? slot.price * qty : 0);
  }, 0);

  // 3. NGHIỆP VỤ TẠO ĐƠN & THANH TOÁN
  const handleCheckout = async () => {
    // [FIX] Bổ sung guard isProcessing tránh tạo trùng đơn hàng khi nhấn liên tiếp
    if (cart.size === 0 || isProcessing) return;
    setIsProcessing(true);
    try {
      const payload: CreateOrderRequest = {
        machineId: selectedMachineId,
        items: [...cart.entries()].flatMap(([slotId, quantity]) => {
          const slot = slots.find((item) => item.slotId === slotId);
          if (!slot?.productId) return [];
          return [{ slotId, productId: slot.productId, slotNumber: slot.slotId, quantity, unitPrice: slot.price }];
        }),
      };
      if (!payload.items.length) throw new Error('Giỏ hàng không còn sản phẩm hợp lệ.');
      const order = await kioskService.createOrder(payload);
      processedDispenseOrderRef.current = null;
      setPaymentWebhookSent(false);
      setCurrentOrder(order);
      setTimeLeft(60);
      setPaymentStatus('PENDING');
    } catch (error: unknown) {
      console.error(error);
      toast.error('Không thể tạo đơn hàng. Vui lòng kiểm tra lại kết nối mạng.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Backend hiện cung cấp GET /orders/{id}; polling tới khi có kết quả thanh toán và nhả hàng.
  useEffect(() => {
    if (!currentOrder || !['PENDING', 'SUCCESS', 'EXPIRED'].includes(paymentStatus)) return;
    const orderId = currentOrder.orderId;

    if (paymentStatus === 'PENDING') {
      // [FIX] Chỉ giảm bộ đếm thuần túy, không gọi setPaymentStatus bên trong updater
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }

    let active = true;
    // [FIX] Ngăn gửi chồng request khi phản hồi mạng chậm hơn chu kỳ 2 giây
    let isChecking = false;

    const checkStatus = async () => {
      if (isChecking) return;
      isChecking = true;
      try {
        const latest = await kioskService.getOrderStatus(orderId);
        if (!active) return;
        setCurrentOrder(latest);

        // [FIX] Ưu tiên kiểm tra lỗi kẹt hàng (JAMMED) trước trạng thái trung gian SUCCESS
        if (latest.dispenseStatus === 'JAMMED') {
          processedDispenseOrderRef.current = latest.orderCode || latest.orderId;
          setPaymentStatus('JAMMED');
        } else if (
          latest.paymentStatus === 'SUCCESS' &&
          (latest.dispenseStatus === 'COMPLETED' || latest.dispenseStatus === 'DISPENSED')
        ) {
          const orderKey = latest.orderCode || latest.orderId;
          if (processedDispenseOrderRef.current !== orderKey) {
            processedDispenseOrderRef.current = orderKey;
            setResetTimer(5);
            setPaymentStatus('DISPENSING');
          }
        } else if (latest.paymentStatus === 'SUCCESS') {
          setPaymentStatus('SUCCESS');
        } else if (latest.paymentStatus === 'FAILED') {
          setPaymentStatus('FAILED');
        }
      } catch (error) {
        console.error('Không thể cập nhật trạng thái đơn hàng:', error);
      } finally {
        isChecking = false;
      }
    };
    void checkStatus();
    const polling = setInterval(checkStatus, 2000);

    return () => {
      active = false;
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      clearInterval(polling);
    };
  }, [currentOrder, paymentStatus]);

  // [FIX] Tách chuyển trạng thái EXPIRED ra effect riêng khi đồng hồ chạm 0
  useEffect(() => {
    if (paymentStatus === 'PENDING' && timeLeft === 0) {
      setPaymentStatus('EXPIRED');
    }
  }, [paymentStatus, timeLeft]);

  // HÀM RESET
  const handleResetKiosk = useCallback((showReadyToast = false) => {
    setPaymentStatus('IDLE');
    setCurrentOrder(null);
    setPaymentWebhookSent(false);
    processedDispenseOrderRef.current = null;
    setCart(new Map());
    // [FIX] Đưa đồng hồ về mặc định để tránh lệch trạng thái ở giao dịch tiếp theo
    setTimeLeft(60);
    setResetTimer(5);
    if (showReadyToast) {
      toast.success('Giao dịch hoàn tất! Kiosk đã sẵn sàng phục vụ lượt tiếp theo.');
    }
    fetchMachineData(); 
  }, [fetchMachineData]);

  // 5. Xử lý màn hình Xuất hàng (Dispensing) sau khi SUCCESS
  useEffect(() => {
    if (paymentStatus === 'DISPENSING') {
      // [FIX] Chỉ giảm bộ đếm thuần túy trong interval
      resetTimerRef.current = setInterval(() => {
        setResetTimer((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
      
      return () => {
        if (resetTimerRef.current) {
          clearInterval(resetTimerRef.current);
          resetTimerRef.current = null;
        }
      };
    }
  }, [paymentStatus]);

  // [FIX] Tự động reset kiosk trong effect riêng khi bộ đếm xuất hàng về 0
  useEffect(() => {
    if (paymentStatus === 'DISPENSING' && resetTimer === 0) {
      handleResetKiosk(true);
    }
  }, [paymentStatus, resetTimer, handleResetKiosk]);

  const handleSimulatePayment = async () => {
    if (!currentOrder || simulatingPayment || paymentWebhookSent || paymentStatus !== 'PENDING') return;
    setSimulatingPayment(true);
    try {
      await kioskService.simulatePaymentWebhook(
        currentOrder.orderCode,
        currentOrder.totalAmount,
        simulateJam
      );
      setPaymentWebhookSent(true);
    } catch (error) {
      console.error('Lỗi giả lập webhook thanh toán:', error);
      toast.error('Không thể gửi tín hiệu thanh toán tới Backend.');
    } finally {
      setSimulatingPayment(false);
    }
  };

  // --- RENDER GIAO DIỆN ---
  if (loading) return <div className="h-screen w-full bg-white flex items-center justify-center"><RefreshCw className="animate-spin text-emerald-600 w-16 h-16"/></div>;

  const isFoodSafetyLocked = machineStatus !== null && machineStatus.status !== 'ONLINE';

  // [FIX] Phòng vệ giá trị rỗng và khoảng trắng thừa khi tìm kiếm
  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredSlots = slots.filter(s => (s.productName ?? '').toLowerCase().includes(normalizedQuery));

  const selectedMachine = machines.find((m) => m.id === selectedMachineId);

  return (
    <div className="h-screen w-full bg-gray-100 flex overflow-hidden font-sans relative select-none">
      <FoodSafetyOverlay
        isLocked={isFoodSafetyLocked}
        status={machineStatus?.status}
        machineName={selectedMachine ? `${selectedMachine.name} (${selectedMachine.serialNumber})` : `Máy #${selectedMachineId}`}
      />
      
      {/* SIDEBAR DANH MỤC */}
      <aside className="w-48 bg-white border-r border-gray-200 flex flex-col items-center py-8 shadow-sm shrink-0 z-10">
        <h2 className="text-2xl font-black text-emerald-600 mb-10 tracking-tight px-2 text-center w-full">
          Fresh<span className="text-gray-800">Vend</span>
        </h2>
        <div className="flex-1 w-full space-y-4 px-4">
          {POS_CATEGORIES.map(cat => (
            <button key={cat} onClick={() => setActiveCategory(cat)}
              className={`w-full flex flex-col items-center p-4 rounded-2xl text-[13px] uppercase tracking-wider font-bold transition-all ${
                activeCategory === cat ? 'bg-emerald-50 text-emerald-600 border border-emerald-200 shadow-sm' : 'text-gray-500 hover:bg-gray-50 border border-transparent'
              }`}>
              <Tag className="w-8 h-8 mb-2 opacity-80" />
              {cat}
            </button>
          ))}
        </div>
      </aside>

      {/* MAIN LƯỚI SẢN PHẨM */}
      <main className="flex-1 flex flex-col bg-gray-50 min-w-0 relative">
        <header className="h-24 bg-white border-b border-gray-200 flex justify-between items-center px-8 gap-4 shrink-0 shadow-sm z-10">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-400" />
            <input type="text" placeholder="Tìm kiếm đồ uống, trái cây..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-14 pr-6 py-4 bg-gray-100 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none font-medium text-lg" />
          </div>
          <div className="flex items-center gap-4">
            <select
              aria-label="Chọn máy bán hàng"
              value={selectedMachineId}
              onChange={(e) => {
                setSelectedMachineId(Number(e.target.value));
                setCart(new Map());
              }}
              className="px-3 py-2.5 bg-gray-100 border border-gray-200 rounded-xl text-sm font-bold text-gray-700"
            >
              {machines.length === 0 ? (
                <option value={selectedMachineId}>Máy #{selectedMachineId}</option>
              ) : (
                machines.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.serialNumber})
                  </option>
                ))
              )}
            </select>
            <label className="flex items-center gap-2 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-2 rounded-xl cursor-pointer">
              <input
                type="checkbox"
                checked={simulateJam}
                onChange={(e) => setSimulateJam(e.target.checked)}
                className="rounded border-amber-300 text-amber-600"
              />
              <span>Bật giả lập kẹt động cơ</span>
            </label>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></div>
              <span className="font-bold text-gray-600 text-lg">{machineStatus?.temperature?.toFixed(1) || '4.5'}°C</span>
            </div>
            <button
              type="button"
              onClick={dispenseWs.reconnect}
              title={dispenseWs.isConnected ? 'WebSocket đang kết nối' : 'WebSocket mất kết nối — nhấn để kết nối lại'}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold border ${
                dispenseWs.isConnected
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}
            >
              {dispenseWs.isConnected ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
              <span>{dispenseWs.isConnected ? 'WS Live' : 'Polling'}</span>
            </button>
            <button
              type="button"
              onClick={() => void toggleFullscreen()}
              title={isFullscreen ? 'Thoát toàn màn hình' : 'Chế độ toàn màn hình'}
              className="p-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
            >
              {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
            </button>
          </div>
        </header>
        
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar pb-32">
          {connectionError ? (
            <div className="w-full max-w-lg mx-auto mt-16 bg-red-50 border border-red-200 rounded-2xl p-6 text-center space-y-4">
              <p className="text-red-700 font-bold text-lg">{connectionError}</p>
              <button
                type="button"
                onClick={() => void fetchMachineData()}
                className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-sm transition-colors"
              >
                Thử kết nối lại
              </button>
            </div>
          ) : slots.length === 0 ? (
             <div className="w-full text-center text-gray-400 mt-20 text-xl font-medium">Chưa có sản phẩm nào được tải từ máy chủ.</div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
              {filteredSlots.map(slot => {
                const isOutOfStock = slot.currentStock <= 0 || slot.status === 'OUT_OF_STOCK';
                const qty = cart.get(slot.slotId) ?? 0;
                
                return (
                  <div key={slot.slotId} onClick={() => !isOutOfStock && handleAddToCart(slot)}
                    className={`bg-white rounded-3xl p-5 border shadow-sm cursor-pointer active:scale-95 transition-all ${
                      isOutOfStock ? 'opacity-40 grayscale border-gray-100' : 'border-gray-200 hover:border-emerald-400 hover:shadow-md'
                    }`}>
                    <div className="aspect-square bg-gray-50 rounded-2xl mb-4 relative flex items-center justify-center overflow-hidden">
                      <img
                        src={slot.productImageUrl || FALLBACK_PRODUCT_IMAGE}
                        alt={slot.productName}
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = FALLBACK_PRODUCT_IMAGE;
                        }}
                        className="object-cover h-full p-2"
                      />
                      {qty > 0 && <div className="absolute top-2 right-2 bg-emerald-500 text-white w-10 h-10 rounded-full flex items-center justify-center font-black text-lg shadow-md">{qty}</div>}
                      {isOutOfStock && <div className="absolute inset-0 bg-white/50 flex items-center justify-center"><span className="bg-red-500 text-white font-black text-xs px-3 py-1.5 rounded rotate-[-12deg] shadow-lg border border-white">SOLD OUT</span></div>}
                    </div>
                    <h3 className="font-bold text-gray-800 text-lg line-clamp-2 min-h-[3.5rem] leading-tight mb-2">{slot.productName}</h3>
                    <p className="text-emerald-600 font-black text-2xl">{slot.price.toLocaleString('vi-VN')} đ</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* CART GIỎ HÀNG */}
      <aside className="w-[420px] bg-white border-l border-gray-200 flex flex-col shadow-2xl shrink-0 z-20">
        <div className="h-24 flex items-center justify-between px-8 bg-emerald-600 text-white shrink-0">
          <h2 className="text-2xl font-black flex items-center gap-3"><ShoppingCart className="w-8 h-8" /> HÓA ĐƠN</h2>
          {cart.size > 0 && (
            <button onClick={() => setCart(new Map())} className="text-emerald-100 hover:text-white flex items-center gap-1 font-bold text-sm bg-emerald-700/50 px-3 py-1.5 rounded-lg transition-colors">
              <Trash2 className="w-4 h-4"/> Xóa hết
            </button>
          )}
        </div>
        
        <div className="flex-1 overflow-y-auto bg-gray-50 p-4 custom-scrollbar">
          {cart.size === 0 ? (
             <div className="h-full flex flex-col items-center justify-center text-gray-300 space-y-4">
               <ShoppingCart className="w-24 h-24 opacity-50" />
               <p className="font-bold text-xl text-gray-400">Giỏ hàng đang trống</p>
             </div>
          ) : (
             <div className="space-y-3">
              {[...cart.entries()].map(([id, qty]) => {
                const slot = slots.find(s => s.slotId === id);
                if (!slot) return null;
                return (
                  <div key={id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                      <h4 className="font-bold text-gray-800 text-lg flex-1 pr-3 leading-tight">{slot.productName}</h4>
                      <p className="text-emerald-600 font-bold text-xl whitespace-nowrap">{(slot.price * qty).toLocaleString('vi-VN')}đ</p>
                    </div>
                    <div className="flex items-center justify-between">
                      <button onClick={() => handleRemoveItem(id)} className="text-gray-400 hover:text-red-500 p-2 hover:bg-red-50 rounded-xl transition-colors"><Trash2 className="w-6 h-6"/></button>
                      <div className="flex items-center bg-gray-100 rounded-xl p-1.5">
                        <button onClick={() => handleDecreaseQty(id)} className="w-10 h-10 bg-white rounded-lg shadow-sm flex items-center justify-center text-gray-700 active:scale-95"><Minus className="w-5 h-5"/></button>
                        <span className="font-black w-10 text-center text-xl">{qty}</span>
                        <button onClick={() => handleAddToCart(slot)} disabled={qty >= slot.currentStock} className="w-10 h-10 bg-white rounded-lg shadow-sm flex items-center justify-center text-gray-700 active:scale-95 disabled:opacity-30"><Plus className="w-5 h-5"/></button>
                      </div>
                    </div>
                  </div>
                );
              })}
             </div>
          )}
        </div>
        
        <div className="p-8 bg-white border-t border-gray-200 shrink-0">
          <div className="flex justify-between items-center mb-6">
            <span className="font-bold text-gray-500 text-xl">Tổng thanh toán:</span>
            <span className="text-4xl font-black text-emerald-600">{totalAmount.toLocaleString('vi-VN')} đ</span>
          </div>
          <button onClick={handleCheckout} disabled={cart.size === 0 || isProcessing || isFoodSafetyLocked || paymentStatus !== 'IDLE'} 
            className="w-full h-20 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-2xl rounded-2xl flex justify-center items-center gap-3 shadow-lg disabled:bg-gray-300 disabled:shadow-none transition-all active:scale-[0.98]">
            {isProcessing ? <RefreshCw className="w-8 h-8 animate-spin"/> : <><CreditCard className="w-8 h-8"/> THANH TOÁN NGAY</>}
          </button>
        </div>
      </aside>

      {/* OVERLAY THANH TOÁN VÀ XUẤT HÀNG */}
      {paymentStatus !== 'IDLE' && (
        <div className="absolute inset-0 bg-gray-900/90 backdrop-blur-md z-[100] flex items-center justify-center p-6">
          <div className="bg-white p-12 rounded-[2rem] w-full max-w-xl shadow-2xl text-center relative overflow-hidden">
            
            {paymentStatus === 'PENDING' && currentOrder && (
              <>
                <div className="absolute top-0 left-0 right-0 h-3 bg-emerald-500"></div>
                <h2 className="text-3xl font-black text-gray-800 mb-2">Thanh Toán VietQR</h2>
                <p className="text-gray-500 font-medium mb-8 text-lg">Mã đơn: <span className="font-bold text-gray-800">{currentOrder.orderCode}</span></p>
                
                <div className="bg-white p-4 rounded-3xl inline-block mb-6 border-2 border-dashed border-emerald-200 shadow-sm">
                  <img src={currentOrder.qrCodeUrl} className="w-64 h-64 object-contain rounded-2xl" alt="VietQR" />
                </div>
                
                <p className="text-5xl font-black text-emerald-600 mb-6">{currentOrder.totalAmount.toLocaleString('vi-VN')} đ</p>
                <div className="flex items-center justify-center gap-3 text-orange-500 font-bold mb-6 bg-orange-50 py-3 rounded-xl text-lg">
                  <RefreshCw className="w-6 h-6 animate-spin" />
                  Chờ thanh toán ({Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')})
                </div>

                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={() => void handleSimulatePayment()}
                    disabled={simulatingPayment || paymentWebhookSent}
                    className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black text-lg rounded-2xl shadow-md transition-colors"
                  >
                    {simulatingPayment
                      ? 'Đang xác nhận thanh toán...'
                      : paymentWebhookSent
                        ? 'Đã gửi xác nhận thanh toán — Đang chờ xử lý...'
                      : simulateJam
                        ? '⚡ Xác nhận Đã Chuyển Khoản (Test Kẹt Motor → DLQ)'
                        : '⚡ Xác nhận Đã Chuyển Khoản (Demo Webhook)'}
                  </button>
                  <button onClick={() => handleResetKiosk()} className="w-full py-3.5 bg-gray-100 text-gray-600 font-bold text-lg rounded-2xl hover:bg-gray-200 transition-colors">
                    Hủy giao dịch
                  </button>
                </div>
              </>
            )}

            {paymentStatus === 'SUCCESS' && (
              <div className="py-12">
                <CheckCircle className="w-32 h-32 text-emerald-500 mx-auto mb-8" />
                <h2 className="text-4xl font-black text-gray-800 mb-4">Đã nhận thanh toán!</h2>
                <p className="text-gray-500 text-xl font-medium">Hệ thống đang xử lý đơn hàng...</p>
              </div>
            )}

            {paymentStatus === 'DISPENSING' && (
              <div className="py-12">
                <PackageOpen className="w-32 h-32 text-emerald-500 mx-auto mb-8 animate-bounce" />
                <h2 className="text-4xl font-black text-gray-800 mb-4">Đang xuất hàng...</h2>
                <p className="text-emerald-600 font-bold text-2xl mb-8">Vui lòng nhận hàng ở khe bên dưới!</p>
                
                <div className="w-full bg-gray-100 h-3 rounded-full mb-6 overflow-hidden">
                  <div className="bg-emerald-500 h-full transition-all duration-1000 ease-linear" style={{ width: `${(resetTimer / 5) * 100}%` }}></div>
                </div>
                
                <p className="text-gray-400 font-medium">Tự động hoàn tất sau {resetTimer} giây</p>
                
                <button onClick={() => handleResetKiosk(true)} className="mt-8 w-full py-4 bg-emerald-600 text-white rounded-2xl font-black text-xl shadow-lg active:scale-95 transition-all">
                  HOÀN TẤT & QUAY LẠI
                </button>
              </div>
            )}

            {(paymentStatus === 'FAILED' || paymentStatus === 'EXPIRED' || paymentStatus === 'JAMMED') && (
              <div className="py-12">
                <div className="w-32 h-32 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-8">
                  <X className="w-16 h-16 text-red-500" />
                </div>
                <h2 className="text-4xl font-black text-gray-800 mb-4">
                  {paymentStatus === 'EXPIRED' ? 'Hết thời gian chờ thanh toán' : paymentStatus === 'JAMMED' ? 'Máy gặp sự cố khi nhả hàng' : 'Giao dịch thất bại'}
                </h2>
                <p className="text-gray-500 text-xl mb-10">
                  {paymentStatus === 'JAMMED'
                    ? currentOrder?.refundVoucherCode
                      ? `Động cơ nhả hàng gặp sự cố (kẹt khay). Hệ thống đã cấp mã voucher hỗ trợ mô phỏng: ${currentOrder.refundVoucherCode} (không phải hoàn tiền tự động về ngân hàng).`
                      : 'Động cơ nhả hàng gặp sự cố (kẹt khay). Vui lòng liên hệ nhân viên vận hành để được hỗ trợ.'
                    : paymentStatus === 'EXPIRED'
                      ? 'Đã hết thời gian chờ trên màn hình. Backend chưa có API hủy/hết hạn đơn; vui lòng xác nhận trạng thái đơn với nhân viên trước khi thanh toán lại.'
                      : 'Vui lòng thử lại hoặc chọn mặt hàng khác.'}
                </p>
                {/* [FIX] Mở lối thoát cho trạng thái EXPIRED để tránh khóa chết màn hình kiosk */}
                <button onClick={() => handleResetKiosk()} className="w-full py-4 bg-gray-800 text-white rounded-2xl font-black text-xl shadow-lg">
                  {paymentStatus === 'EXPIRED' ? 'QUAY LẠI MÀN HÌNH CHÍNH' : 'LÀM LẠI TỪ ĐẦU'}
                </button>
              </div>
            )}
            
          </div>
        </div>
      )}
    </div>
  );
}
