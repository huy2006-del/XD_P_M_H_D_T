import { useState, useEffect } from 'react';
import { kioskService } from '../services/kioskService';
import type { MachineStatusResponse } from '../services/kioskService';

export const useMachineStatus = (machineId: number, pollingInterval = 5000) => {
  const [statusData, setStatusData] = useState<MachineStatusResponse | null>(null);
  const [isLocked, setIsLocked] = useState(false);

  useEffect(() => {
    if (!machineId) return;
    let isMounted = true;

    const fetchStatus = async () => {
      try {
        const data = await kioskService.getMachineStatus(machineId);
        if (isMounted) {
          setStatusData(data);
          // Khóa máy nếu trạng thái là OUT_OF_ORDER hoặc MAINTENANCE
          setIsLocked(data.status !== 'ACTIVE');
        }
      } catch (error) {
        console.error("Lỗi khi kiểm tra trạng thái máy Kiosk:", error);
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
