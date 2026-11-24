import { useCallback, useState } from 'react';
import { auditService } from '../../audit/auditService';
import type { AuditLogItem } from '../../audit/types';

export interface RestockHistoryEntry {
  id: number;
  timestamp: string;
  operatorUsername: string;
  details: string;
  slotCode?: string;
  batchCode?: string;
  quantity?: number;
}

function parseRestockDetails(details: string): { quantity?: number; batchCode?: string; slotId?: string } {
  // Pattern: "Nạp {quantity} sản phẩm từ lô {batchCode} vào khay ID {slotId}"
  const regex = /Nạp\s+(\d+)\s+sản phẩm từ lô\s+([A-Za-z0-9_-]+)\s+vào khay ID\s+(\d+)/i;
  const match = details.match(regex);
  if (match) {
    return {
      quantity: Number(match[1]),
      batchCode: match[2],
      slotId: match[3],
    };
  }
  return {};
}

export function useRestockHistory() {
  const [history, setHistory] = useState<RestockHistoryEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const logs: AuditLogItem[] = await auditService.getAuditLogs({
        action: 'RESTOCK_COMPLETED',
      });

      const entries: RestockHistoryEntry[] = logs
        .map((log) => {
        const parsed = parseRestockDetails(log.details || '');
        return {
          id: log.id,
          timestamp: log.createdAt,
          operatorUsername: log.username,
          details: log.details || 'Nạp hàng vào khay máy',
          batchCode: parsed.batchCode,
          slotCode: parsed.slotId ? `Khay #${parsed.slotId}` : undefined,
          quantity: parsed.quantity,
        };
        });

      // Sắp xếp thời gian mới nhất lên đầu
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
