import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import type { MachineSlot } from '../slotTypes';

export const useMachineSlots = (machineId: number) => {
  const [slots, setSlots] = useState<MachineSlot[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchSlots = useCallback(async () => {
    if (!machineId) return;
    setLoading(true);
    try {
      const res = await axios.get(`/api/v1/machines/${machineId}/slots`);
      setSlots(res.data);
    } catch (error) {
      console.error("Lỗi lấy danh sách khay:", error);
    } finally {
      setLoading(false);
    }
  }, [machineId]);

  const updateSlot = async (slotId: number, data: Partial<MachineSlot>) => {
    await axios.put(`/api/v1/slots/${slotId}`, data);
    await fetchSlots();
  };

  useEffect(() => {
    fetchSlots();
  }, [fetchSlots]);

  return { slots, loading, updateSlot, refresh: fetchSlots };
};
