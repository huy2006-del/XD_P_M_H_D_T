import React from 'react';
import { usePaymentPolling } from '../hooks/usePaymentPolling';

interface Props {
  orderId: string;
  amount: number;
  content: string;
  qrCodeUrl: string;
  onPaid: () => void;
  onCancel: () => void;
}

export const VietQRPaymentModal: React.FC<Props> = ({ orderId, amount, content, qrCodeUrl, onPaid, onCancel }) => {
  // Lấy ra số giây còn lại từ Hook
  const { timeLeft } = usePaymentPolling(orderId, onPaid, onCancel);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl relative animate-scale-up">
        
        <button onClick={onCancel} className="absolute top-4 right-4 text-gray-400 hover:text-red-500 font-bold text-xl">
          &times;
        </button>

        <h2 className="text-2xl font-bold text-blue-700 mb-2">Thanh toán VietQR</h2>
        <p className="text-sm text-gray-500 mb-6">Mở app Ngân hàng để quét mã</p>
        
        <div className="bg-gray-50 p-4 rounded-xl mb-6 inline-block border-2 border-dashed border-blue-200">
          {qrCodeUrl ? <img src={qrCodeUrl} alt="VietQR do máy chủ tạo" className="w-56 h-56 mx-auto object-contain" /> : <p className="w-56 py-16 text-sm text-red-600">Backend chưa trả mã QR cho đơn này.</p>}
        </div>

        <div className="mb-4">
          <div className="text-sm text-gray-500">Số tiền thanh toán</div>
          <div className="text-3xl font-black text-blue-600">{amount.toLocaleString('vi-VN')} đ</div>
        </div>

        <div className="mb-6">
          <div className="text-sm text-gray-500">Nội dung chuyển khoản</div>
          <div className="text-lg font-mono font-bold text-gray-800 bg-gray-100 py-2 rounded-lg">{content}</div>
        </div>

        <div className="flex items-center justify-center gap-2 text-red-500 font-bold">
          <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Còn {timeLeft}s chờ cập nhật trạng thái thanh toán
        </div>
      </div>
    </div>
  );
};
