import { useMemo, useState } from 'react';
import { useProductList, useCreateProduct, useUpdateProduct, useToggleProductStatus } from '../hooks/useProducts';
import { ProductFilters, StatusFilter } from '../components/ProductFilters';
import { ProductTable } from '../components/ProductTable';
import { ProductFormModal } from '../components/ProductFormModal';
import { Pagination } from '@/shared/components/ui/Pagination';
import { Product, ProductUpsertPayload } from '../types/product.types';

const PAGE_SIZE = 10;

export const ProductListPage = () => {
  const [page, setPage] = useState(1); // UI 1-based
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
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

      {/* Filters */}
      <ProductFilters
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

      {/* View Detail Modal (đơn giản) */}
      {viewing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          onClick={() => setViewing(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-3 text-lg font-semibold">{viewing.name}</h3>
            <dl className="space-y-2 text-sm">
              <Row label="SKU" value={viewing.sku} />
              <Row label="Đơn giá" value={new Intl.NumberFormat('vi-VN').format(viewing.price) + ' ₫'} />
              <Row label="Đơn vị" value={viewing.unit} />
              <Row label="Hạn sử dụng" value={`${viewing.shelfLifeDays} ngày`} />
              <Row label="Dải nhiệt" value={`${viewing.minTempC}°C – ${viewing.maxTempC}°C`} />
              <Row label="Trạng thái" value={viewing.isActive ? 'Đang bán' : 'Ngừng bán'} />
              {viewing.description && <Row label="Mô tả" value={viewing.description} />}
            </dl>
          </div>
        </div>
      )}
    </div>
  );
};

const Row = ({ label, value }: { label: string; value: string }) => (
  <div className="flex justify-between gap-4">
    <dt className="text-slate-500">{label}</dt>
    <dd className="text-right font-medium text-slate-800">{value}</dd>
  </div>
);
