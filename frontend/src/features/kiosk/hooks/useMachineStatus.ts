import { useState, useEffect } from 'react';
import { kioskService } from '../services/kioskService';
import type { MachineStatusDTO } from '../types/kiosk';

export const useMachineStatus = (machineId: number, pollingInterval = 5000) => {
  const [statusData, setStatusData] = useState<MachineStatusDTO | null>(null);
  const [isLocked, setIsLocked] = useState(false);

  useEffect(() => {
    if (!machineId) return;
    let isMounted = true;

    const fetchStatus = async () => {
      try {
        const data = await kioskService.getMachineStatus(machineId);
        if (isMounted) {
          setStatusData(data);
          // Khóa máy nếu không ở trạng thái ONLINE
          setIsLocked(data.status !== 'ONLINE');
        }
      } catch (error) {
        console.error('Lỗi khi kiểm tra trạng thái máy Kiosk:', error);
      }
    };

    fetchStatus(); // Gọi ngay lần đầu
    const intervalId = setInterval(fetchStatus, pollingInterval);

    return () => {
      isMounted = false;
      clearInterval(intervalId); // Cleanup khi unmount
    };
  }, [machineId, pollingInterval]);

  return { statusData, isLocked };
};