import { useState, useEffect } from 'react';
import { kioskService } from '../services/kioskService';
import type { MachineSlot } from '../../slots/slotTypes';

export const useKioskInventory = (machineId: number) => {
  const [slots, setSlots] = useState<MachineSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!machineId) return;
    let isMounted = true;

    const fetchInventory = async () => {
      try {
        setLoading(true);
        const data = await kioskService.getMachineSlots(machineId);
        if (isMounted) {
          setSlots(data);
          setError(null);
        }
      } catch {
        if (isMounted) {
          setError('Không thể kết nối đến máy chủ. Vui lòng thử lại sau.');
          setSlots([]);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchInventory();

    return () => {
      isMounted = false;
    };
  }, [machineId]);

  return { slots, loading, error };
};
