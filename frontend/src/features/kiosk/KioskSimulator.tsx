import { useState, useEffect, useCallback, useRef } from 'react';
import { ShoppingCart, AlertTriangle, X, CheckCircle, RefreshCw } from 'lucide-react';
import { Client } from '@stomp/stompjs';
import { kioskService } from './services/kioskService';
import type { 
  MachineSlotDTO, 
  OrderResponse, 
  MachineStatusDTO, 
  CreateOrderRequest 
} from './types/kiosk';

const MACHINE_ID = 1;

export default function KioskSimulator() {
  // --- State Quản lý Dữ liệu ---
  const [machineStatus, setMachineStatus] = useState<MachineStatusDTO | null>(null);
  const [slots, setSlots] = useState<MachineSlotDTO[]>([]);
  
  // Bỏ <boolean> để tránh lỗi TSX Parsing (TS tự hiểu là boolean)
  const [loading, setLoading] = useState(true);
  
  // --- State Giỏ hàng ---
  const [cart, setCart] = useState(new Map()); 
  const [isProcessing, setIsProcessing] = useState(false);

  // --- State Đơn hàng & Thanh toán ---
  const [currentOrder, setCurrentOrder] = useState<OrderResponse | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<'IDLE' | 'PENDING' | 'SUCCESS' | 'FAILED' | 'EXPIRED'>('IDLE');
  
  // Timer đếm ngược QR
  const [timeLeft, setTimeLeft] = useState<number>(300);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 1. Tải dữ liệu ban đầu
  const fetchMachineData = useCallback(async () => {
    setLoading(true);
    try {
      const [statusData, slotsData] = await Promise.all([
        kioskService.getMachineStatus(MACHINE_ID),
        kioskService.getMachineSlots(MACHINE_ID)
      ]);
      setMachineStatus(statusData);
      setSlots(slotsData);
    } catch (error: unknown) {
      console.error('Lỗi kết nối Server:', error);
      setMachineStatus({ machineId: MACHINE_ID, status: 'OFFLINE', temperature: 0 });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMachineData();
  }, [fetchMachineData]);

  // 2. Nghiệp vụ Giỏ hàng (Chặn vượt tồn)
  const handleAddToCart = (slot: MachineSlotDTO) => {
    if (slot.currentStock <= 0 || slot.status === 'OUT_OF_STOCK') return;
    
    setCart((prev: Map<number, number>) => {
      const newCart = new Map(prev);
      const currentQty = newCart.get(slot.slotId) ?? 0;
      if (currentQty < slot.currentStock) {
        newCart.set(slot.slotId, currentQty + 1);
      }
      return newCart;
    });
  };

  // Dùng Spread Operator [...] thay cho Array.from để TS nhận chuẩn kiểu [number, number]
  const totalAmount = [...cart.entries()].reduce((sum, [slotId, qty]) => {
    const slot = slots.find(s => s.slotId === slotId);
    return sum + (slot ? slot.price * qty : 0);
  }, 0);

  // 3. Nghiệp vụ Tạo Đơn & Chờ Thanh Toán
  const handleCheckout = async () => {
    if (cart.size === 0 || machineStatus?.status !== 'ONLINE') return;
    
    setIsProcessing(true);
    try {
      const payload: CreateOrderRequest = {
        machineId: MACHINE_ID,
        items: [...cart.entries()].map(([slotId, quantity]) => ({ slotId, quantity }))
      };
      
      const order = await kioskService.createOrder(payload);
      setCurrentOrder(order);
      setPaymentStatus('PENDING');
      setTimeLeft(300);
    } catch (error: unknown) {
      console.error('Lỗi khi tạo đơn hàng:', error);
      alert('Không thể tạo đơn hàng. Vui lòng thử lại.');
    } finally {
      setIsProcessing(false);
    }
  };

  // 4. Lắng nghe WebSocket & Polling Fallback
  useEffect(() => {
    if (!currentOrder || paymentStatus !== 'PENDING') return;

    // A. Thiết lập WebSocket
    const client = new Client({
      brokerURL: 'ws://localhost:8080/ws-endpoint',
      onConnect: () => {
        client.subscribe(`/topic/orders/${currentOrder.orderId}`, (message) => {
          const body = JSON.parse(message.body);
          if (body.status === 'PAID') {
            setPaymentStatus('SUCCESS');
          } else if (body.status === 'FAILED' || body.status === 'CANCELLED') {
            setPaymentStatus('FAILED');
          }
        });
      }
    });
    client.activate();

    // B. Đếm ngược & Timeout
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          kioskService.cancelOrder(currentOrder.orderId).catch(err => console.warn('Hủy đơn thất bại:', err));
          setPaymentStatus('EXPIRED');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // C. Polling dự phòng (3s/lần nếu rớt WS)
    const pollingTimer = setInterval(async () => {
      try {
        const { status } = await kioskService.getOrderStatus(currentOrder.orderId);
        if (status === 'PAID') setPaymentStatus('SUCCESS');
        if (status === 'FAILED') setPaymentStatus('FAILED');
      } catch (err: unknown) {
        console.warn('Lỗi polling trạng thái đơn hàng:', err);
      }
    }, 3000);

    return () => {
      client.deactivate();
      if (timerRef.current) clearInterval(timerRef.current);
      clearInterval(pollingTimer);
    };
  }, [currentOrder, paymentStatus]);

  // 5. Hiển thị UI theo trạng thái
  if (loading) {
    return (
      <div className="h-screen bg-slate-950 flex items-center justify-center text-white">
        <RefreshCw className="animate-spin w-10 h-10 text-emerald-400" />
      </div>
    );
  }

  // Khóa UI nếu máy lỗi
  if (machineStatus?.status !== 'ONLINE') {
    return (
      <div className="h-screen bg-slate-950 flex flex-col items-center justify-center text-center p-6">
        <AlertTriangle className="w-24 h-24 text-red-500 mb-6 animate-pulse" />
        <h1 className="text-4xl font-black text-white mb-2">HỆ THỐNG ĐANG BẢO TRÌ</h1>
        <p className="text-slate-400 text-lg">Thiết bị đang mất kết nối hoặc gặp sự cố. Vui lòng quay lại sau.</p>
        <button onClick={fetchMachineData} className="mt-8 px-6 py-3 bg-slate-800 text-white rounded-xl">
          Thử lại
        </button>
      </div>
    );
  }

  // Render Luồng chuẩn (Menu -> QR -> Dispense)
  return (
    <div className="h-screen bg-slate-950 flex flex-col relative text-white">
      {/* Header */}
      <header className="p-4 bg-slate-900 border-b border-slate-800 flex justify-between items-center">
        <h1 className="text-2xl font-black text-emerald-400">FRESH KIOSK</h1>
        <span className="px-3 py-1 bg-sky-500/20 text-sky-400 rounded-full text-sm font-bold">
          Nhiệt độ: {machineStatus.temperature}°C
        </span>
      </header>

      {/* Main Grid */}
      <main className="flex-1 p-6 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 overflow-y-auto pb-32">
        {slots.map(slot => {
          const isOutOfStock = slot.currentStock <= 0 || slot.status === 'OUT_OF_STOCK';
          const qtyInCart = cart.get(slot.slotId) ?? 0;

          return (
            <div key={slot.slotId} className={`bg-slate-900 rounded-2xl p-4 border flex flex-col ${isOutOfStock ? 'border-slate-800 opacity-50' : 'border-slate-700'}`}>
              <div className="h-40 bg-slate-800 rounded-xl mb-4 overflow-hidden flex items-center justify-center relative">
                <img src={slot.productImageUrl || 'https://via.placeholder.com/200'} alt={slot.productName} className="object-cover h-full w-full" />
                {isOutOfStock && <div className="absolute inset-0 bg-black/60 flex items-center justify-center font-bold text-red-400">HẾT HÀNG</div>}
              </div>
              <h3 className="font-bold text-lg mb-1">{slot.productName}</h3>
              <p className="text-emerald-400 font-bold mb-4">{slot.price.toLocaleString('vi-VN')} đ</p>
              
              <button 
                disabled={isOutOfStock || qtyInCart >= slot.currentStock}
                onClick={() => handleAddToCart(slot)}
                className="mt-auto bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-2 rounded-xl disabled:bg-slate-700 disabled:text-slate-500 transition"
              >
                {qtyInCart > 0 ? `Đã chọn (${qtyInCart})` : 'Chọn mua'}
              </button>
            </div>
          );
        })}
      </main>

      {/* Cart Footer */}
      {cart.size > 0 && paymentStatus === 'IDLE' && (
        <footer className="absolute bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 p-6 flex justify-between items-center shadow-2xl">
          <div>
            <p className="text-slate-400 text-sm">Đã chọn {cart.size} sản phẩm</p>
            <p className="text-3xl font-black text-emerald-400">{totalAmount.toLocaleString('vi-VN')} đ</p>
          </div>
          <div className="flex gap-4">
            <button onClick={() => setCart(new Map())} className="px-6 py-3 rounded-xl border border-slate-700 hover:bg-slate-800 font-bold">
              Hủy
            </button>
            <button onClick={handleCheckout} disabled={isProcessing} className="px-8 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-lg shadow-lg flex items-center gap-2">
              {isProcessing ? <RefreshCw className="animate-spin w-5 h-5" /> : <ShoppingCart />}
              THANH TOÁN
            </button>
          </div>
        </footer>
      )}

      {/* Payment/QR Modal */}
      {paymentStatus !== 'IDLE' && currentOrder && (
        <div className="absolute inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 p-8 rounded-3xl max-w-md w-full border border-slate-700 text-center">
            
            {paymentStatus === 'PENDING' && (
              <>
                <h2 className="text-2xl font-black mb-2">Thanh Toán VietQR</h2>
                <p className="text-slate-400 mb-6">Mã đơn: {currentOrder.orderCode}</p>
                <div className="bg-white p-4 rounded-2xl inline-block mb-6">
                  <img src={currentOrder.qrCodeUrl} alt="VietQR" className="w-64 h-64 object-contain" />
                </div>
                <p className="text-3xl font-black text-emerald-400 mb-4">{currentOrder.totalAmount.toLocaleString('vi-VN')} đ</p>
                <p className="text-amber-400 font-bold mb-6">
                  Thời gian còn lại: {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                </p>
                <button onClick={() => setPaymentStatus('IDLE')} className="w-full py-3 border border-slate-700 rounded-xl hover:bg-slate-800">
                  Đóng / Hủy giao dịch
                </button>
              </>
            )}

            {paymentStatus === 'SUCCESS' && (
              <div className="py-12">
                <CheckCircle className="w-24 h-24 text-emerald-400 mx-auto mb-6" />
                <h2 className="text-3xl font-black text-emerald-400 mb-2">Thanh toán thành công!</h2>
                <p className="text-slate-300">Máy đang chuẩn bị nhả hàng, vui lòng chờ trong giây lát...</p>
                <button onClick={() => { setPaymentStatus('IDLE'); setCart(new Map()); fetchMachineData(); }} className="mt-8 px-8 py-3 bg-emerald-500 text-slate-950 font-bold rounded-xl">
                  Quay về trang chủ
                </button>
              </div>
            )}

            {(paymentStatus === 'FAILED' || paymentStatus === 'EXPIRED') && (
              <div className="py-12">
                <X className="w-24 h-24 text-red-500 mx-auto mb-6" />
                <h2 className="text-3xl font-black text-red-400 mb-2">
                  {paymentStatus === 'EXPIRED' ? 'Hết hạn thanh toán' : 'Giao dịch thất bại'}
                </h2>
                <button onClick={() => { setPaymentStatus('IDLE'); setCurrentOrder(null); }} className="mt-8 px-8 py-3 bg-slate-800 text-white font-bold rounded-xl border border-slate-700">
                  Thử lại
                </button>
              </div>
            )}
            
          </div>
        </div>
      )}
    </div>
  );
}
