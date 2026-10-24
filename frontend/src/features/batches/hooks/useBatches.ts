import { useState, useEffect, useCallback } from 'react';
import axios from 'axios'; // Hoặc dùng apiClient của bạn
import type { FruitBatch, CreateBatchRequest } from '../types';

const API_URL = '/api/v1/batches'; // Thay bằng base URL thực tế của bạn

export const useBatches = () => {
  const [batches, setBatches] = useState<FruitBatch[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBatches = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.get(API_URL);
      setBatches(response.data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Lỗi khi tải danh sách lô hàng');
    } finally {
      setLoading(false);
    }
  }, []);

  const createBatch = async (data: CreateBatchRequest) => {
    try {
      await axios.post(API_URL, data);
      await fetchBatches(); // Refresh lại danh sách sau khi thêm
    } catch (err: any) {
      throw new Error(err.response?.data?.message || 'Lỗi khi tạo lô hàng mới');
    }
  };

  useEffect(() => {
    fetchBatches();
  }, [fetchBatches]);

  return { batches, loading, error, createBatch, refresh: fetchBatches };
};
