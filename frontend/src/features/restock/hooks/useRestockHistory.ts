import { useCallback, useState } from 'react';
import axiosInstance from '../../../shared/api/axiosInstance';
import type { RestockSession } from '../types';

export interface RestockHistoryEntry {
  id: number;
  timestamp: string;
  operatorUsername: string;
  details: string;
  slotCode?: string;
  batchCode?: string;
  quantity?: number;
}

export function useRestockHistory() {
  const [history, setHistory] = useState<RestockHistoryEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data } = await axiosInstance.get<RestockSession[]>('/api/v1/restock-sessions');
      const entries = data.flatMap((session) => {
        const timestamp = session.completedAt;
        if (session.status !== 'COMPLETED' || !timestamp) return [];
        return session.items.map((item) => ({
          id: item.id,
          timestamp,
          operatorUsername: session.operatorId,
          details:
            session.sessionCode +
            ' · Máy #' +
            session.machineId +
            (item.productName ? ' · ' + item.productName : ''),
          batchCode: item.batchCode || '#' + item.batchId,
          slotCode: item.slotCode || 'Khay #' + item.slotId,
          quantity: item.quantityAdded,
        }));
      });
      entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setHistory(entries);
    } catch (err: unknown) {
      setHistory([]);
      setError(err instanceof Error ? err.message : 'Không thể tải lịch sử nạp hàng.');
    } finally {
      setLoading(false);
    }
  }, []);

  return { history, loading, error, refresh: fetchHistory };
}
