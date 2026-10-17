import { useMemo, useState } from 'react';
import { useProductList, useCreateProduct, useUpdateProduct, useToggleProductStatus } from '../hooks/useProducts';
import { ProductToolbar, type ProductStatusFilter } from '../components/ProductToolbar';
import { ProductTable } from '../components/ProductTable';
import { ProductFormModal } from '../components/ProductFormModal';
import { ProductDetailDrawer } from '../components/ProductDetailDrawer';
import { Pagination } from '@/shared/components/ui/Pagination';
import type { Product, ProductUpsertPayload } from '../types/product.types';

const PAGE_SIZE = 10;

export const ProductListPage = () => {
  const [page, setPage] = useState(1); // UI 1-based
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState<ProductStatusFilter>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [togglingId, setTogglingId] = useState<string | undefined>();
  const [viewing, setViewing] = useState<Product | null>(null);

  const query = useMemo(
    () => ({
      page: page - 1,
      size: PAGE_SIZE,
      keyword: keyword || undefined,
      isActive: status === 'all' ? undefined : status === 'active',
    }),
    [page, keyword, status]
  );

  const { data, isLoading, isFetching } = useProductList(query);
  const createMutation = useCreateProduct();
  const updateMutation = useUpdateProduct();
  const toggleMutation = useToggleProductStatus();

  const products = data?.content ?? [];
  const totalPages = data?.totalPages ?? 0;
  const totalElements = data?.totalElements ?? 0;

  const handleCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const handleEdit = (product: Product) => {
    setEditing(product);
    setModalOpen(true);
  };

  const handleToggle = (product: Product, next: boolean) => {
    setTogglingId(product.id);
    toggleMutation.mutate(
      { id: product.id, isActive: next },
      { onSettled: () => setTogglingId(undefined) }
    );
  };

  const handleSubmit = async (payload: ProductUpsertPayload) => {
    if (editing) {
      await updateMutation.mutateAsync({ id: editing.id, payload });
    } else {
      await createMutation.mutateAsync(payload);
    }
    setModalOpen(false);
    setEditing(null);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Danh mục Sản phẩm</h1>
          <p className="text-sm text-slate-500">
            Quản lý sản phẩm trái cây, dải nhiệt độ bảo quản và trạng thái kinh doanh.
          </p>
        </div>
        {isFetching && !isLoading && (
          <span className="text-xs text-slate-400">Đang cập nhật…</span>
        )}
      </div>

            {/* Toolbar */}
      <ProductToolbar
        keyword={keyword}
        status={status}
        onKeywordChange={(v) => {
          setKeyword(v);
          setPage(1);
        }}
        onStatusChange={(v) => {
          setStatus(v);
          setPage(1);
        }}
        onCreate={handleCreate}
      />

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <ProductTable
          products={products}
          isLoading={isLoading}
          togglingId={togglingId}
          onToggleStatus={handleToggle}
          onEdit={handleEdit}
          onView={setViewing}
        />
        {totalElements > 0 && (
          <Pagination
            page={page}
            totalPages={totalPages}
            totalElements={totalElements}
            onPageChange={setPage}
          />
        )}
      </div>

      {/* Create / Edit Modal */}
      <ProductFormModal
        open={modalOpen}
        mode={editing ? 'edit' : 'create'}
        product={editing}
        submitting={createMutation.isPending || updateMutation.isPending}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        onSubmit={handleSubmit}
      />

            {/* Detail Drawer */}
      <ProductDetailDrawer
        open={!!viewing}
        product={viewing}
        onClose={() => setViewing(null)}
        onEdit={(p) => {
          setViewing(null);
          setEditing(p);
          setModalOpen(true);
        }}
      />
    </div>
  );
};
