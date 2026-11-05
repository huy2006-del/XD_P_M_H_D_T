import { useState, useEffect } from 'react';
import { kioskService } from '../services/kioskService';

export const usePaymentPolling = (orderId: string | null, onPaid: () => void, onTimeout: () => void) => {
  const [timeLeft, setTimeLeft] = useState(60);

  useEffect(() => {
    if (!orderId) return;

    let isMounted = true;
    setTimeLeft(60); // Reset timer khi có order mới

    // 1. Logic Đếm ngược mỗi 1 giây
    const timerInterval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerInterval);
          onTimeout(); // Hết 60s thì gọi callback timeout
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // 2. Logic Polling kiểm tra API mỗi 2 giây
    const pollingInterval = setInterval(async () => {
      try {
        const data = await kioskService.checkPaymentStatus(orderId);
        if (isMounted && data.status === 'PAID') {
          clearInterval(pollingInterval);
          clearInterval(timerInterval);
          onPaid(); // Nhận được tiền -> Gọi callback thành công
        }
      } catch (error) {
        console.error("Lỗi khi kiểm tra thanh toán", error);
      }
    }, 2000);

    // Cleanup khi component unmount hoặc khi orderId thay đổi
    return () => {
      isMounted = false;
      clearInterval(timerInterval);
      clearInterval(pollingInterval);
    };
  }, [orderId, onPaid, onTimeout]);

  return { timeLeft };
};
