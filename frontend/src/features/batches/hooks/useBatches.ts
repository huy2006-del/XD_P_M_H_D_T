import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import axiosInstance from '../../../shared/api/axiosInstance';
import type { PaginatedResponse } from '../../../shared/types/common.types';
import type { FruitBatch, CreateBatchRequest } from '../types';

export interface BatchQuery {
  page?: number;
  size?: number;
  productId?: number;
  expired?: boolean;
  expiringWithinDays?: number;
}

const API_URL = '/api/v1/batches';

export const useBatches = () => {
  const [batches, setBatches] = useState<FruitBatch[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBatches = useCallback(async (query: BatchQuery = {}) => {
    setLoading(true);
    try {
      const pageSize = query.size ?? 100;
      const firstPage = await axiosInstance.get<PaginatedResponse<FruitBatch>>(
        API_URL,
        { params: { ...query, page: 0, size: pageSize } }
      );
      const pages = await Promise.all(
        Array.from({ length: Math.max(0, firstPage.data.totalPages - 1) }, (_, index) =>
          axiosInstance.get<PaginatedResponse<FruitBatch>>(API_URL, {
            params: { ...query, page: index + 1, size: pageSize },
          })
        )
      );
      const allBatches = [firstPage, ...pages].flatMap((pageResponse) =>
        Array.isArray(pageResponse.data.content) ? pageResponse.data.content : []
      );
      setBatches(allBatches);
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
