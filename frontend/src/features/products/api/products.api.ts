import { axiosInstance } from '@/shared/api/axiosInstance';
import type { PaginatedResponse } from '@/shared/types/common.types';
import type {
  Product,
  ProductListQuery,
  ProductUpsertPayload,
} from '../types/product.types';

const BASE = '/api/v1/products';
const API_ORIGIN = (
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  'http://localhost:8080'
).replace(/\/$/, '');

export const productsApi = {
  list: async (query: ProductListQuery): Promise<PaginatedResponse<Product>> => {
    const { data } = await axiosInstance.get<PaginatedResponse<Product>>(BASE, {
      params: {
        page: query.page,
        size: query.size,
        keyword: query.keyword || undefined,
        isActive: query.isActive,
      },
    });
    return data;
  },

  getById: async (id: string): Promise<Product> => {
    const { data } = await axiosInstance.get<Product>(`${BASE}/${id}`);
    return data;
  },

  create: async (payload: ProductUpsertPayload): Promise<Product> => {
    const { data } = await axiosInstance.post<Product>(BASE, payload);
    return data;
  },

  update: async (id: string, payload: ProductUpsertPayload): Promise<Product> => {
    const { data } = await axiosInstance.put<Product>(`${BASE}/${id}`, payload);
    return data;
  },

  toggleStatus: async (id: string, isActive: boolean): Promise<Product> => {
    const { data } = await axiosInstance.patch<Product>(`${BASE}/${id}/status`, { isActive });
    return data;
  },

  remove: async (id: string): Promise<void> => {
    await axiosInstance.delete(`${BASE}/${id}`);
  },

  uploadImage: async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    const { data } = await axiosInstance.post<{ imageUrl: string }>(
      `${BASE}/images`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return /^https?:\/\//i.test(data.imageUrl)
      ? data.imageUrl
      : new URL(data.imageUrl, API_ORIGIN).toString();
  },
};
