import { useState, useEffect, useCallback, useRef } from 'react';
import { ShoppingCart, X, CheckCircle, RefreshCw, Search, Plus, Minus, Trash2, Tag, CreditCard, PackageOpen } from 'lucide-react';
import { kioskService } from './services/kioskService';
import type { MachineSlotDTO, OrderResponse, MachineStatusDTO, CreateOrderRequest } from './types/kiosk';

interface Props {
  machineId?: number;
}

const POS_CATEGORIES = ['Trái cây'];

export default function KioskSimulator({ machineId = 1 }: Props) {
  // --- STATE DỮ LIỆU ---
  const [machineStatus, setMachineStatus] = useState<MachineStatusDTO | null>(null);
  const [slots, setSlots] = useState<MachineSlotDTO[]>([]);
  const [loading, setLoading] = useState(true);
  
  // --- STATE UI & TÌM KIẾM ---
  const [activeCategory, setActiveCategory] = useState('Trái cây');
  const [searchQuery, setSearchQuery] = useState('');
  
  // --- STATE GIỎ HÀNG ---
  const [cart, setCart] = useState(new Map()); 
  const [isProcessing, setIsProcessing] = useState(false);
  
  // --- STATE THANH TOÁN & HOÀN TẤT ---
  const [currentOrder, setCurrentOrder] = useState<OrderResponse | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<'IDLE' | 'PENDING' | 'SUCCESS' | 'FAILED' | 'EXPIRED' | 'DISPENSING' | 'JAMMED'>('IDLE');
  
  const [timeLeft, setTimeLeft] = useState<number>(60);
  const [resetTimer, setResetTimer] = useState<number>(5);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const resetTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 1. Tải dữ liệu máy và hàng hóa
  const fetchMachineData = useCallback(async () => {
    setLoading(true);
    try {
      const [statusData, slotsData] = await Promise.all([
        kioskService.getMachineStatus(machineId),
        kioskService.getMachineSlots(machineId)
      ]);
      setMachineStatus(statusData);
      setSlots(slotsData);
    } catch (error: unknown) {
      console.error('Lỗi kết nối Server:', error);
      setMachineStatus(null);
      setSlots([]);
    } finally {
      setLoading(false);
    }
  }, [machineId]);

  useEffect(() => { fetchMachineData(); }, [fetchMachineData]);

  // 2. NGHIỆP VỤ GIỎ HÀNG
  const handleAddToCart = (slot: MachineSlotDTO) => {
    if (slot.currentStock <= 0 || slot.status === 'OUT_OF_STOCK') return;
    setCart((prev: Map<number, number>) => {
      const newCart = new Map(prev);
      const currentQty: number = newCart.get(slot.slotId) ?? 0;
      if (currentQty < slot.currentStock) newCart.set(slot.slotId, currentQty + 1);
      return newCart;
    });
  };

  const handleDecreaseQty = (slotId: number) => {
    setCart((prev: Map<number, number>) => {
      const newCart = new Map(prev);
      const currentQty: number = newCart.get(slotId) ?? 0;
      if (currentQty > 1) newCart.set(slotId, currentQty - 1);
      else newCart.delete(slotId);
      return newCart;
    });
  };

  const handleRemoveItem = (slotId: number) => {
    setCart((prev: Map<number, number>) => {
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
    if (cart.size === 0) return; 
    setIsProcessing(true);
    try {
      const payload: CreateOrderRequest = {
        machineId,
        items: [...cart.entries()].flatMap(([slotId, quantity]) => {
          const slot = slots.find((item) => item.slotId === slotId);
          if (!slot?.productId) return [];
          return [{ slotId, productId: slot.productId, slotNumber: slot.slotId, quantity, unitPrice: slot.price }];
        }),
      };
      if (!payload.items.length) throw new Error('Giỏ hàng không còn sản phẩm hợp lệ.');
      const order = await kioskService.createOrder(payload);
      setCurrentOrder(order);
      setPaymentStatus('PENDING');
      setTimeLeft(60);
    } catch (error: unknown) {
      console.error(error);
      alert('Không thể tạo đơn hàng. Vui lòng kiểm tra lại kết nối mạng.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Backend hiện cung cấp GET /orders/{id}; polling tới khi có kết quả thanh toán và nhả hàng.
  useEffect(() => {
    if (!currentOrder || !['PENDING', 'SUCCESS', 'EXPIRED'].includes(paymentStatus)) return;
    const orderId = currentOrder.orderId;

    if (paymentStatus === 'PENDING') {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setPaymentStatus('EXPIRED');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    let active = true;
    const checkStatus = async () => {
      try {
        const latest = await kioskService.getOrderStatus(orderId);
        if (!active) return;
        setCurrentOrder(latest);
        if (latest.paymentStatus === 'SUCCESS' && latest.dispenseStatus === 'COMPLETED') setPaymentStatus('DISPENSING');
        else if (latest.paymentStatus === 'SUCCESS') setPaymentStatus('SUCCESS');
        else if (latest.paymentStatus === 'FAILED') setPaymentStatus('FAILED');
        else if (latest.dispenseStatus === 'JAMMED') setPaymentStatus('JAMMED');
      } catch (error) {
        console.error('Không thể cập nhật trạng thái đơn hàng:', error);
      }
    };
    void checkStatus();
    const polling = setInterval(checkStatus, 2000);

    return () => {
      active = false;
      if (timerRef.current) clearInterval(timerRef.current);
      clearInterval(polling);
    };
  }, [currentOrder?.orderId, paymentStatus]);

  // HÀM RESET
  const handleResetKiosk = useCallback(() => {
    setPaymentStatus('IDLE');
    setCurrentOrder(null);
    setCart(new Map());
    fetchMachineData(); 
  }, [fetchMachineData]);

  // 5. Xử lý màn hình Xuất hàng (Dispensing) sau khi SUCCESS
  useEffect(() => {
    if (paymentStatus === 'DISPENSING') {
      setResetTimer(5);
      resetTimerRef.current = setInterval(() => {
        setResetTimer((prev) => {
          if (prev <= 1) {
            handleResetKiosk();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      return () => {
        if (resetTimerRef.current) clearInterval(resetTimerRef.current);
      };
    }
  }, [paymentStatus, handleResetKiosk]);

  // --- RENDER GIAO DIỆN ---
  if (loading) return <div className="h-screen w-full bg-white flex items-center justify-center"><RefreshCw className="animate-spin text-emerald-600 w-16 h-16"/></div>;
  
  if (machineStatus?.status !== 'ONLINE') return (
    <div className="h-screen w-full bg-gray-50 flex flex-col items-center justify-center p-6 text-center">
      <div className="mb-6 text-6xl" role="img" aria-label="Cảnh báo">⚠️</div>
      <h2 className="text-3xl md:text-5xl font-black text-gray-800 mb-4">TẠM NGƯNG PHỤC VỤ VÌ AN TOÀN THỰC PHẨM</h2>
      <p className="text-gray-500 text-xl mb-8">Máy đang {machineStatus?.status ?? 'không kết nối'}. Hệ thống tạm khóa để bảo vệ sản phẩm. Vui lòng quay lại sau.</p>
      <button onClick={fetchMachineData} className="px-10 py-4 bg-emerald-600 text-white text-xl font-bold rounded-2xl shadow-lg">Khởi động lại</button>
    </div>
  );

  const filteredSlots = slots.filter(s => s.productName.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="h-screen w-full bg-gray-100 flex overflow-hidden font-sans relative select-none">
      
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
      <main className="flex-1 flex flex-col bg-gray-50 min-w-0">
        <header className="h-24 bg-white border-b border-gray-200 flex justify-between items-center px-8 shrink-0 shadow-sm z-10">
          <div className="relative w-full max-w-xl">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-400" />
            <input type="text" placeholder="Tìm kiếm đồ uống, trái cây..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-14 pr-6 py-4 bg-gray-100 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none font-medium text-lg" />
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></div>
            <span className="font-bold text-gray-600 text-lg">{machineStatus?.temperature?.toFixed(1) || '0.0'}°C</span>
          </div>
        </header>
        
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar pb-32">
          {slots.length === 0 ? (
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
                      <img src={slot.productImageUrl || 'https://via.placeholder.com/200'} alt={slot.productName} className="object-cover h-full p-2" />
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
          <button onClick={handleCheckout} disabled={cart.size === 0 || isProcessing} 
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
                <div className="flex items-center justify-center gap-3 text-orange-500 font-bold mb-8 bg-orange-50 py-3 rounded-xl text-lg">
                  <RefreshCw className="w-6 h-6 animate-spin" />
                  Chờ thanh toán ({Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')})
                </div>
                
                <button onClick={handleResetKiosk} className="w-full py-4 bg-gray-100 text-gray-600 font-bold text-xl rounded-2xl hover:bg-gray-200 transition-colors">
                  Hủy giao dịch
                </button>
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
                
                <button onClick={handleResetKiosk} className="mt-8 w-full py-4 bg-emerald-600 text-white rounded-2xl font-black text-xl shadow-lg active:scale-95 transition-all">
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
                <p className="text-gray-500 text-xl mb-10">{paymentStatus === 'JAMMED' && currentOrder?.refundVoucherCode ? `Mã voucher hỗ trợ: ${currentOrder.refundVoucherCode}` : paymentStatus === 'EXPIRED' ? 'Đã hết thời gian chờ trên màn hình. Backend chưa có API hủy/hết hạn đơn; vui lòng xác nhận trạng thái đơn với nhân viên trước khi thanh toán lại.' : 'Vui lòng thử lại hoặc chọn mặt hàng khác.'}</p>
                {paymentStatus !== 'EXPIRED' && <button onClick={handleResetKiosk} className="w-full py-4 bg-gray-800 text-white rounded-2xl font-black text-xl shadow-lg">LÀM LẠI TỪ ĐẦU</button>}
              </div>
            )}
            
          </div>
        </div>
      )}
    </div>
  );
}
