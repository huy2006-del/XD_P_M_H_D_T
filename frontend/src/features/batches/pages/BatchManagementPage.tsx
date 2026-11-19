import React, { useMemo, useState } from 'react';
import { useBatches } from '../hooks/useBatches';
import { BatchTable } from '../components/BatchTable';
import { CreateBatchModal } from '../components/CreateBatchModal';
import { RefreshCw, Search } from 'lucide-react';
import { useProductList } from '../../products/hooks/useProducts';
import { Pagination } from '../../../shared/components/ui/Pagination';

const PAGE_SIZE = 10;

export const BatchManagementPage: React.FC<{ canCreate?: boolean }> = ({ canCreate = true }) => {
  const { batches, loading, error, createBatch, refresh } = useBatches();
  const { data: productData } = useProductList({ page: 0, size: 100 });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ALL');
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => batches.filter((batch) => {
    const matchesSearch = `${batch.batchCode} ${batch.productName} ${batch.supplier}`
      .toLowerCase().includes(search.trim().toLowerCase());
    const matchesStatus = status === 'ALL' ||
      (status === 'EXPIRED' && batch.expired) ||
      (status === 'EXPIRING' && !batch.expired && batch.daysToExpiry <= 2) ||
      (status === 'SAFE' && !batch.expired && batch.daysToExpiry > 2);
    return matchesSearch && matchesStatus;
  }), [batches, search, status]);
  const pageCount = Math.ceil(filtered.length / PAGE_SIZE);
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="mx-auto max-w-7xl space-y-5 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Lô hàng và hạn sử dụng</h1>
          <p className="mt-1 text-sm text-gray-500">Theo dõi số lượng còn lại và ưu tiên lô gần hết hạn.</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => void refresh()} disabled={loading} className="inline-flex items-center gap-2 rounded-lg border bg-white px-4 py-2 text-sm disabled:opacity-50">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Làm mới
          </button>
          {canCreate && <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700"
        >
          + Nhập Lô Mới
        </button>}
        </div>
      </div>

      <div className="grid gap-3 rounded-xl border bg-white p-4 md:grid-cols-[1fr_220px]">
        <label className="relative block">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Tìm mã lô, sản phẩm, nhà cung cấp" className="w-full rounded-lg border py-2 pl-9 pr-3 text-sm" />
        </label>
        <select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} className="rounded-lg border px-3 py-2 text-sm">
          <option value="ALL">Tất cả hạn dùng</option>
          <option value="EXPIRED">Đã hết hạn</option>
          <option value="EXPIRING">Sắp hết hạn (≤ 2 ngày)</option>
          <option value="SAFE">Còn an toàn</option>
        </select>
      </div>

      {loading ? (
        <div role="status" className="rounded-xl border bg-white py-10 text-center text-gray-500">Đang tải danh sách lô...</div>
      ) : error ? (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-700">
          <p>{error}</p><button type="button" onClick={() => void refresh()} className="mt-2 underline">Thử tải lại</button>
        </div>
      ) : (
        <>
          <BatchTable batches={pageRows} />
          {filtered.length > 0 && <Pagination page={page} totalPages={pageCount} totalElements={filtered.length} onPageChange={setPage} />}
          {filtered.length === 0 && <p className="rounded-lg border bg-white p-6 text-center text-sm text-gray-500">Không có lô phù hợp bộ lọc.</p>}
        </>
      )}

      {canCreate && <CreateBatchModal
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        products={(productData?.content ?? []).map((product) => ({
          id: Number(product.id),
          name: product.name,
        }))}
        onSubmit={createBatch} 
      />}
    </div>
  );
};
