import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { productsApi } from '../api/products.api';
import type {
  ProductListQuery,
  ProductUpsertPayload,
} from '../types/product.types';

export const productKeys = {
  all: ['products'] as const,
  list: (q: ProductListQuery) => [...productKeys.all, 'list', q] as const,
  detail: (id: string) => [...productKeys.all, 'detail', id] as const,
};

export const useProductList = (query: ProductListQuery) =>
  useQuery({
    queryKey: productKeys.list(query),
    queryFn: () => productsApi.list(query),
    placeholderData: (prev) => prev,
    staleTime: 30_000,
  });

export const useProductDetail = (id?: string) =>
  useQuery({
    queryKey: productKeys.detail(id ?? ''),
    queryFn: () => productsApi.getById(id!),
    enabled: !!id,
  });

export const useCreateProduct = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: ProductUpsertPayload) => productsApi.create(payload),
    onSuccess: () => {
      toast.success('Đã tạo sản phẩm mới');
      qc.invalidateQueries({ queryKey: productKeys.all });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? 'Tạo sản phẩm thất bại');
    },
  });
};

export const useUpdateProduct = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ProductUpsertPayload }) =>
      productsApi.update(id, payload),
    onSuccess: () => {
      toast.success('Đã cập nhật sản phẩm');
      qc.invalidateQueries({ queryKey: productKeys.all });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? 'Cập nhật thất bại');
    },
  });
};

export const useToggleProductStatus = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      productsApi.toggleStatus(id, isActive),
    // Optimistic update
    onMutate: async ({ id, isActive }) => {
      await qc.cancelQueries({ queryKey: productKeys.all });
      const previous = qc.getQueriesData({ queryKey: productKeys.all });
      previous.forEach(([key, data]) => {
        if (!data) return;
        const anyData = data as any;
        if (Array.isArray(anyData?.content)) {
          qc.setQueryData(key, {
            ...anyData,
            content: anyData.content.map((p: any) =>
              p.id === id ? { ...p, isActive } : p
            ),
          });
        }
      });
      return { previous };
    },
    onError: (_e, _v, ctx) => {
      ctx?.previous?.forEach(([key, data]) => qc.setQueryData(key, data));
      toast.error('Không thể đổi trạng thái');
    },
    onSettled: () => qc.invalidateQueries({ queryKey: productKeys.all }),
  });
};

export const useDeleteProduct = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => productsApi.remove(id),
    onSuccess: () => {
      toast.success('Đã xóa sản phẩm');
      qc.invalidateQueries({ queryKey: productKeys.all });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? 'Xóa sản phẩm thất bại');
    },
  });
};