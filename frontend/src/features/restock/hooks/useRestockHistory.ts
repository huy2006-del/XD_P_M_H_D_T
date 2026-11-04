import { useCallback, useState } from "react";
import axios from "axios";
import axiosInstance from "../../../shared/api/axiosInstance";
import type { RestockSession } from "../types";

function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError<{ message?: string }>(error)) {
    return error.response?.data?.message ?? error.message;
  }

  return error instanceof Error ? error.message : "Không thể tải lịch sử nạp hàng.";
}

export function useRestockHistory() {
  const [sessions, setSessions] = useState<RestockSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = useCallback(async (machineId: number) => {
    if (!Number.isSafeInteger(machineId) || machineId <= 0) {
      const message = "Mã máy không hợp lệ.";
      setError(message);
      throw new Error(message);
    }

    setLoading(true);
    setError(null);

    try {
      // The inventory backend must implement this endpoint before this hook is wired to a page.
      const { data } = await axiosInstance.get<RestockSession[]>(
        `/api/v1/restock-sessions/machine/${machineId}`
      );
      setSessions(data);
    } catch (requestError: unknown) {
      const message = getErrorMessage(requestError);
      setError(message);
      throw new Error(message, { cause: requestError });
    } finally {
      setLoading(false);
    }
  }, []);

  return { sessions, loading, error, fetchHistory };
}
