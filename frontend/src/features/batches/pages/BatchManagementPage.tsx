import React, { useState, useEffect } from 'react';
import { Plus, RefreshCw, Search, Filter, Layers, AlertTriangle } from 'lucide-react';
import { useBatches } from '../hooks/useBatches';
import { BatchTable } from '../components/BatchTable';
import { CreateBatchModal } from '../components/CreateBatchModal';
import { productsApi } from '../../products/api/products.api';
import type { Product } from '../../products/types/product.types';

export const BatchManagementPage: React.FC = () => {
  const {
    batches,
    loading,
    error,
    pagination,
    filters,
    setPage,
    updateFilters,
    createBatch,
    refresh,
  } = useBatches();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [expiryFilterMode, setExpiryFilterMode] = useState<string>('all');

  // Tải danh mục sản phẩm cho dropdown lọc
  useEffect(() => {
    let active = true;
    productsApi
      .list({ page: 0, size: 100, isActive: true })
      .then((res) => {
        if (active) setProducts(res.content || []);
      })
      .catch((err) => console.error('Lỗi khi tải sản phẩm cho filter:', err));

    return () => {
      active = false;
    };
  }, []);

  const handleExpiryFilterChange = (mode: string) => {
    setExpiryFilterMode(mode);
    switch (mode) {
      case 'expired':
        updateFilters({ expired: true, expiringWithinDays: null });
        break;
      case 'expiring_3':
        updateFilters({ expired: false, expiringWithinDays: 3 });
        break;
      case 'expiring_7':
        updateFilters({ expired: false, expiringWithinDays: 7 });
        break;
      case 'safe':
        updateFilters({ expired: false, expiringWithinDays: null });
        break;
      default:
        updateFilters({ expired: null, expiringWithinDays: null });
        break;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900">Quản Lý Lô Hàng Kho</h1>
            <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full">
              FEFO Priority
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Theo dõi hạn sử dụng, tồn kho từng lô và nhập lô mới theo quy chuẩn chuỗi lạnh FreshVend.
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <button
            type="button"
            onClick={refresh}
            disabled={loading}
            className="flex items-center justify-center gap-1.5 px-3.5 py-2 border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 rounded-lg text-sm font-medium transition-colors cursor-pointer"
            title="Làm mới dữ liệu"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-600' : ''}`} />
            <span>Làm mới</span>
          </button>

          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm hover:shadow transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Nhập Lô Mới</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Thanh bộ lọc dữ liệu */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-center">
        {/* Tìm kiếm */}
        <div className="relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm theo mã lô, nhà cung cấp..."
            value={filters.search || ''}
            onChange={(e) => updateFilters({ search: e.target.value })}
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* Lọc theo Sản Phẩm */}
        <div className="relative">
          <Layers className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <select
            value={filters.productId || ''}
            onChange={(e) =>
              updateFilters({ productId: e.target.value ? Number(e.target.value) : null })
            }
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
          >
            <option value="">Tất cả sản phẩm</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        {/* Lọc theo Tình Trạng Hạn Sử Dụng */}
        <div className="relative">
          <Filter className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <select
            value={expiryFilterMode}
            onChange={(e) => handleExpiryFilterChange(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
          >
            <option value="all">Tất cả tình trạng hạn</option>
            <option value="safe">Còn hạn an toàn</option>
            <option value="expiring_3">Sắp hết hạn (≤ 3 ngày)</option>
            <option value="expiring_7">Sắp hết hạn (≤ 7 ngày)</option>
            <option value="expired">Đã hết hạn</option>
          </select>
        </div>

        {/* Đặt lại bộ lọc */}
        <div>
          <button
            type="button"
            onClick={() => {
              setExpiryFilterMode('all');
              updateFilters({ productId: null, expired: null, expiringWithinDays: null, search: '' });
            }}
            className="w-full px-4 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors font-medium text-center cursor-pointer"
          >
            Đặt lại bộ lọc
          </button>
        </div>
      </div>

      {/* Bảng dữ liệu lô hàng */}
      <BatchTable batches={batches} loading={loading} />

      {/* Phân trang (Pagination) */}
      {!loading && pagination.totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-xl border border-gray-100 text-sm text-gray-600">
          <div>
            Hiển thị trang <strong>{pagination.page + 1}</strong> / <strong>{pagination.totalPages}</strong> ({pagination.totalElements} lô hàng)
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={pagination.page <= 0}
              onClick={() => setPage(pagination.page - 1)}
              className="px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed font-medium"
            >
              ← Trước
            </button>

            {Array.from({ length: pagination.totalPages }, (_, i) => (
              <button
                type="button"
                key={i}
                onClick={() => setPage(i)}
                className={`w-8 h-8 rounded-lg font-semibold text-xs ${
                  pagination.page === i
                    ? 'bg-emerald-600 text-white'
                    : 'border border-gray-200 hover:bg-gray-50 text-gray-700'
                }`}
              >
                {i + 1}
              </button>
            ))}

            <button
              type="button"
              disabled={pagination.page >= pagination.totalPages - 1}
              onClick={() => setPage(pagination.page + 1)}
              className="px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed font-medium"
            >
              Sau →
            </button>
          </div>
        </div>
      )}

      {/* Modal Nhập Lô Mới */}
      <CreateBatchModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={createBatch}
      />
    </div>
  );
};
