import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import axiosInstance from '../../../shared/api/axiosInstance';
import type { PaginatedResponse } from '../../../shared/types/common.types';
import type { FruitBatch, CreateBatchRequest, BatchFilterParams } from '../types';

const API_URL = '/api/v1/batches';

export interface BatchPagination {
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export const useBatches = (initialFilters?: Partial<BatchFilterParams>) => {
  const [batches, setBatches] = useState<FruitBatch[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [pagination, setPagination] = useState<BatchPagination>({
    page: 0,
    size: 10,
    totalElements: 0,
    totalPages: 1,
  });

  const [filters, setFilters] = useState<BatchFilterParams>({
    productId: initialFilters?.productId ?? null,
    expired: initialFilters?.expired ?? null,
    expiringWithinDays: initialFilters?.expiringWithinDays ?? null,
    search: initialFilters?.search ?? '',
    page: 0,
    size: 10,
  });

  const fetchBatches = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params: Record<string, unknown> = {
        page: filters.search?.trim() ? 0 : pagination.page,
        size: filters.search?.trim() ? 100 : pagination.size,
      };

      if (filters.productId) {
        params.productId = filters.productId;
      }
      if (typeof filters.expired === 'boolean') {
        params.expired = filters.expired;
      }
      if (typeof filters.expiringWithinDays === 'number' && filters.expiringWithinDays > 0) {
        params.expiringWithinDays = filters.expiringWithinDays;
      }

      const response = await axiosInstance.get<PaginatedResponse<FruitBatch>>(API_URL, { params });
      const firstPage = response.data;
      let items = Array.isArray(firstPage.content) ? firstPage.content : [];

      // API lô hàng chưa hỗ trợ tìm kiếm keyword; nạp các trang còn lại để tìm đủ kho.
      if (filters.search?.trim()) {
        const pageCount = firstPage.totalPages ?? 1;
        if (pageCount > 1) {
          const remainingPages = await Promise.all(
            Array.from({ length: pageCount - 1 }, (_, index) =>
              axiosInstance.get<PaginatedResponse<FruitBatch>>(API_URL, {
                params: { ...params, page: index + 1 },
              })
            )
          );
          items = [...items, ...remainingPages.flatMap((page) => page.data.content ?? [])];
        }

        const query = filters.search.trim().toLowerCase();
        items = items.filter(
          (b) =>
            b.batchCode?.toLowerCase().includes(query) ||
            (b.supplier && b.supplier.toLowerCase().includes(query)) ||
            (b.productName && b.productName.toLowerCase().includes(query))
        );
        const totalElements = items.length;
        const totalPages = Math.max(1, Math.ceil(totalElements / pagination.size));
        items = items.slice(pagination.page * pagination.size, (pagination.page + 1) * pagination.size);
        setPagination((prev) => ({ ...prev, totalElements, totalPages }));
      } else {
        setPagination((prev) => ({
          ...prev,
          page: firstPage.page ?? 0,
          size: firstPage.size ?? pagination.size,
          totalElements: firstPage.totalElements ?? items.length,
          totalPages: firstPage.totalPages ?? Math.max(1, Math.ceil(items.length / pagination.size)),
        }));
      }

      setBatches(items);
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
  }, [pagination.page, pagination.size, filters.productId, filters.expired, filters.expiringWithinDays, filters.search]);

  const createBatch = async (data: CreateBatchRequest): Promise<FruitBatch> => {
    try {
      const response = await axiosInstance.post<FruitBatch>(API_URL, data);
      await fetchBatches();
      return response.data;
    } catch (err: unknown) {
      const message = axios.isAxiosError<{ message?: string }>(err)
        ? err.response?.data?.message ?? err.message
        : err instanceof Error
          ? err.message
          : 'Lỗi khi tạo lô hàng mới';
      throw new Error(message, { cause: err });
    }
  };

  const setPage = (pageIndex: number) => {
    setPagination((prev) => ({ ...prev, page: Math.max(0, pageIndex) }));
  };

  const updateFilters = (newFilters: Partial<BatchFilterParams>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
    setPagination((prev) => ({ ...prev, page: 0 })); // Reset về trang đầu khi đổi filter
  };

  useEffect(() => {
    fetchBatches();
  }, [fetchBatches]);

  return {
    batches,
    loading,
    error,
    pagination,
    filters,
    setPage,
    updateFilters,
    createBatch,
    refresh: fetchBatches,
  };
};
