import { useState } from 'react';
import axios from 'axios';
import axiosInstance from '../../../shared/api/axiosInstance';
import type {
  AddItemRequest,
  FruitBatch,
  MachineSlot,
  RestockItem,
} from '../types';

const API_BASE = '/api/v1';

function getErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError<{ message?: string }>(error)) {
    return error.response?.data?.message ?? error.message ?? fallback;
  }

  return error instanceof Error ? error.message : fallback;
}

export const useRestockSession = () => {
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [items, setItems] = useState<RestockItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createSession = async <T extends object>(data: T) => {
    try {
      setError(null);
      const res = await axiosInstance.post<{ id: number }>(
        `${API_BASE}/restock-sessions`,
        data
      );
      setSessionId(res.data.id);
      return res.data;
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Không thể tạo phiên nạp hàng'));
      throw err;
    }
  };

  const addItem = async (
    data: AddItemRequest,
    slotInfo: MachineSlot,
    batchInfo: FruitBatch
  ) => {
    if (sessionId === null) {
      const error = new Error('Chưa tạo phiên nạp hàng.');
      setError(error.message);
      throw error;
    }

    try {
      setError(null);
      await axiosInstance.post(
        `${API_BASE}/restock-sessions/${sessionId}/items`,
        data
      );
      
      // Cập nhật state local
      const newItem: RestockItem = {
        ...data,
        slotCode: slotInfo.slotCode,
        productName: slotInfo.productName ?? '',
        batchCode: batchInfo.batchCode
      };
      
      setItems(prev => [...prev, newItem]);
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Lỗi khi thêm hàng vào khay'));
      throw err;
    }
  };

  const completeSession = async (notes?: string) => {
    if (sessionId === null) {
      const error = new Error('Chưa tạo phiên nạp hàng.');
      setError(error.message);
      throw error;
    }

    setIsSubmitting(true);
    try {
      await axiosInstance.post(
        `${API_BASE}/restock-sessions/${sessionId}/complete`,
        { notes }
      );
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Lỗi khi hoàn tất phiên'));
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetSession = () => {
    setSessionId(null);
    setItems([]);
    setError(null);
  };

  return { sessionId, items, isSubmitting, error, createSession, addItem, completeSession, resetSession };
};