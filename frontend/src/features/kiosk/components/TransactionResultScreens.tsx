import React from 'react';

export interface DispensingScreenProps {
  slotCode?: string | string[];
  // [INTEGRATE] Hỗ trợ nhận bộ đếm ngược tự động hoàn tất từ KioskSimulator
  resetTimer?: number;
  totalResetSeconds?: number;
  onFinish: () => void;
}

export interface JamErrorScreenProps {
  refundVoucherCode?: string | null;
  orderCode?: string;
  onFinish: () => void;
}

// --- Màn hình Nhả hàng thành công (Bình thường) ---
export const DispensingScreen: React.FC<DispensingScreenProps> = ({
  slotCode,
  resetTimer,
  totalResetSeconds = 5,
  onFinish,
}) => {
  const formattedSlotCode = Array.isArray(slotCode)
    ? slotCode.map((code) => code.trim()).filter(Boolean).join(', ')
    : slotCode?.trim() ?? '';

  const hasCountdown = typeof resetTimer === 'number' && totalResetSeconds > 0;
  const progressPercent = hasCountdown
    ? Math.max(0, Math.min(100, (resetTimer / totalResetSeconds) * 100))
    : 0;

  return (
    // [INTEGRATE] Nâng z-index lên z-[100] đồng bộ với lớp overlay của KioskSimulator
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-green-50 p-6 text-center"
    >
      <div className="animate-bounce mb-6">
        <svg aria-hidden="true" className="w-32 h-32 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      </div>
      <h1 className="text-4xl font-bold text-green-700 mb-4 text-center">Giao dịch thành công!</h1>
      <p className="text-2xl text-gray-700 mb-6 animate-pulse">
        {formattedSlotCode ? (
          <>Đang nhả hàng từ khay <strong className="text-green-600">{formattedSlotCode}</strong>...</>
        ) : (
          'Đang nhả hàng, vui lòng nhận hàng ở khe bên dưới...'
        )}
      </p>

      {hasCountdown && (
        <div className="w-full max-w-md mb-8">
          <div className="w-full bg-green-100 h-3 rounded-full mb-3 overflow-hidden">
            <div
              className="bg-green-500 h-full transition-all duration-1000 ease-linear"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <p className="text-gray-500 font-medium">Tự động hoàn tất sau {resetTimer} giây</p>
        </div>
      )}

      <button
        type="button"
        onClick={onFinish}
        className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-full text-xl shadow-lg transition-transform active:scale-95"
      >
        Hoàn tất
      </button>
    </div>
  );
};

// --- Màn hình Lỗi Kẹt hàng (Nhiệm vụ 5.10) ---
export const JamErrorScreen: React.FC<JamErrorScreenProps> = ({
  refundVoucherCode,
  orderCode,
  onFinish,
}) => {
  const safeVoucherCode = refundVoucherCode?.trim();

  return (
    // [INTEGRATE] Nâng z-index lên z-[100] đồng bộ với lớp overlay của KioskSimulator
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-red-50 p-6 text-center"
    >
      <div className="mb-6">
        <svg aria-hidden="true" className="w-32 h-32 text-red-500 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <h1 className="text-4xl font-bold text-red-600 mb-4 text-center">Rất tiếc vì sự cố!</h1>
      <p className="text-xl text-gray-700 mb-2">Hệ thống phát hiện lỗi kẹt cơ học không thể nhả hàng.</p>

      {safeVoucherCode ? (
        <>
          <p className="text-lg text-gray-600 mb-6">Mã hoàn tiền của bạn là:</p>
          <div className="bg-white border-2 border-dashed border-red-400 p-4 rounded-xl mb-8 shadow-sm text-center">
            <span className="text-3xl font-mono font-black text-red-600 tracking-wider select-text">
              {safeVoucherCode}
            </span>
          </div>
        </>
      ) : (
        <p className="text-lg text-gray-600 mb-8 max-w-lg">
          Vui lòng liên hệ nhân viên hỗ trợ để được hoàn tiền
          {orderCode ? <> (Mã đơn: <strong className="text-gray-800">{orderCode}</strong>)</> : ''}.
        </p>
      )}

      <button
        type="button"
        onClick={onFinish}
        className="bg-gray-800 hover:bg-gray-900 text-white font-bold py-3 px-8 rounded-full text-xl shadow-lg transition-transform active:scale-95"
      >
        Đóng
      </button>
    </div>
  );
};
