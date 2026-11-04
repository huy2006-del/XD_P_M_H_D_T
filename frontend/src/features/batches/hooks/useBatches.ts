import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import axiosInstance from '../../../shared/api/axiosInstance';
import type { PaginatedResponse } from '../../../shared/types/common.types';
import type { FruitBatch, CreateBatchRequest } from '../types';

const API_URL = '/api/v1/batches';

export const useBatches = () => {
  const [batches, setBatches] = useState<FruitBatch[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBatches = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axiosInstance.get<PaginatedResponse<FruitBatch>>(
        API_URL
      );
      setBatches(response.data.content);
      setError(null);
    } catch (err: unknown) {
      const message = axios.isAxiosError<{ message?: string }>(err)
        ? err.response?.data?.message ?? err.message
        : err instanceof Error
          ? err.message
          : 'Lỗi khi tải danh sách lô hàng';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  const createBatch = async (data: CreateBatchRequest) => {
    try {
      await axiosInstance.post(API_URL, data);
      await fetchBatches(); // Refresh lại danh sách sau khi thêm
    } catch (err: unknown) {
      const message = axios.isAxiosError<{ message?: string }>(err)
        ? err.response?.data?.message ?? err.message
        : err instanceof Error
          ? err.message
          : 'Lỗi khi tạo lô hàng mới';
      throw new Error(message, { cause: err });
    }
  };

  useEffect(() => {
    fetchBatches();
  }, [fetchBatches]);

  return { batches, loading, error, createBatch, refresh: fetchBatches };
};
