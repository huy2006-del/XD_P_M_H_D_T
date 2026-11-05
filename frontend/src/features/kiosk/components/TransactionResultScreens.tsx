import React from 'react';

// --- Màn hình Nhả hàng thành công (Bình thường) ---
export const DispensingScreen: React.FC<{ slotCode: string, onFinish: () => void }> = ({ slotCode, onFinish }) => {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-green-50">
      <div className="animate-bounce mb-6">
        <svg className="w-32 h-32 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      </div>
      <h1 className="text-4xl font-bold text-green-700 mb-4 text-center">Giao dịch thành công!</h1>
      <p className="text-2xl text-gray-700 mb-8 animate-pulse">Đang nhả hàng từ khay <strong className="text-green-600">{slotCode}</strong>...</p>
      
      <button onClick={onFinish} className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-full text-xl shadow-lg transition-transform active:scale-95">
        Hoàn tất
      </button>
    </div>
  );
};

// --- Màn hình Lỗi Kẹt hàng (Nhiệm vụ 5.10) ---
export const JamErrorScreen: React.FC<{ onFinish: () => void }> = ({ onFinish }) => {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-red-50">
      <div className="mb-6">
        <svg className="w-32 h-32 text-red-500 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <h1 className="text-4xl font-bold text-red-600 mb-4 text-center">Rất tiếc vì sự cố!</h1>
      <p className="text-xl text-gray-700 mb-2">Hệ thống phát hiện lỗi kẹt cơ học không thể nhả hàng.</p>
      <p className="text-lg text-gray-600 mb-6">Mã hoàn tiền của bạn là:</p>
      
      <div className="bg-white border-2 border-dashed border-red-400 p-4 rounded-xl mb-8 shadow-sm text-center">
        <span className="text-3xl font-mono font-black text-red-600 tracking-wider">REFUND-100K</span>
      </div>

      <button onClick={onFinish} className="bg-gray-800 hover:bg-gray-900 text-white font-bold py-3 px-8 rounded-full text-xl shadow-lg transition-transform active:scale-95">
        Đóng
      </button>
    </div>
  );
};
