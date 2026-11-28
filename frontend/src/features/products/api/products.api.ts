import { API_BASE_URL, axiosInstance } from '@/shared/api/axiosInstance';
import type { PaginatedResponse } from '@/shared/types/common.types';
import type {
  Product,
  ProductListQuery,
  ProductUpsertPayload,
} from '../types/product.types';

const BASE = '/api/v1/products';

const resolveProductImageUrl = (url?: string | null): string => {
  if (!url) return '';
  if (/^(https?:|data:|blob:)/i.test(url)) return url;
  return new URL(url, API_BASE_URL).toString();
};

const normalizeProduct = (product: Product): Product => ({
  ...product,
  imageUrl: resolveProductImageUrl(product.imageUrl),
});

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
    return {
      ...data,
      content: (data.content ?? []).map(normalizeProduct),
    };
  },

  getById: async (id: string): Promise<Product> => {
    const { data } = await axiosInstance.get<Product>(`${BASE}/${id}`);
    return normalizeProduct(data);
  },

  create: async (payload: ProductUpsertPayload): Promise<Product> => {
    const { data } = await axiosInstance.post<Product>(BASE, payload);
    return normalizeProduct(data);
  },

  update: async (id: string, payload: ProductUpsertPayload): Promise<Product> => {
    const { data } = await axiosInstance.put<Product>(`${BASE}/${id}`, payload);
    return normalizeProduct(data);
  },

  toggleStatus: async (id: string, isActive: boolean): Promise<Product> => {
    const { data } = await axiosInstance.patch<Product>(`${BASE}/${id}/status`, { isActive });
    return normalizeProduct(data);
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
    return resolveProductImageUrl(data.imageUrl);
  },
};
