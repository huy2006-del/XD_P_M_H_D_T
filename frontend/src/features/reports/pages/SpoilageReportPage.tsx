import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { RefreshCw, Download, Search, AlertTriangle, ArrowUpDown, Filter } from 'lucide-react';
import { spoilageService } from '../spoilageService';
import { SpoilageStatsCards } from '../components/SpoilageStatsCards';
import { SpoilageTable } from '../components/SpoilageTable';
import { TableSkeleton } from '../../../shared/components/ui/Skeleton';
import type { SpoilageReportResponse } from '../types';

type SortOption = 'totalLoss_desc' | 'totalLoss_asc' | 'daysOverdue_desc' | 'spoilageRate_desc' | 'expiryDate_asc';

export const SpoilageReportPage: React.FC = () => {
  const [data, setData] = useState<SpoilageReportResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState<string>('');
  const [supplierFilter, setSupplierFilter] = useState<string>('');
  const [sortBy, setSortBy] = useState<SortOption>('totalLoss_desc');

  const fetchReport = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await spoilageService.getSpoilageReport({ search, supplier: supplierFilter });
      setData(res);
    } catch (err) {
      console.error('Lỗi khi tải báo cáo hao hụt:', err);
      setError('Không thể tải dữ liệu lô hết hạn từ backend.');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [search, supplierFilter]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const supplierOptions = useMemo(() => {
    const set = new Set<string>();
    (data?.batches ?? []).forEach((b) => {
      if (b.supplier) set.add(b.supplier);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'vi'));
  }, [data?.batches]);

  const filteredBatches = useMemo(() => {
    const query = search.trim().toLowerCase();
    const list = (data?.batches ?? []).filter((b) => {
      const matchesSearch =
        !query ||
        b.batchCode.toLowerCase().includes(query) ||
        b.productName.toLowerCase().includes(query) ||
        b.supplier.toLowerCase().includes(query);
      const matchesSupplier = !supplierFilter || b.supplier === supplierFilter;
      return matchesSearch && matchesSupplier;
    });

    return [...list].sort((a, b) => {
      switch (sortBy) {
        case 'totalLoss_asc':
          return a.totalLoss - b.totalLoss;
        case 'daysOverdue_desc':
          return b.daysOverdue - a.daysOverdue;
        case 'spoilageRate_desc':
          return b.spoilageRate - a.spoilageRate;
        case 'expiryDate_asc':
          return new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime();
        case 'totalLoss_desc':
        default:
          return b.totalLoss - a.totalLoss;
      }
    });
  }, [data?.batches, search, supplierFilter, sortBy]);

  const handleExportCSV = () => {
    if (filteredBatches.length > 0) {
      spoilageService.exportSpoilageCSV(filteredBatches);
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto text-gray-800">
      {/* Tiêu đề & Nút xuất báo cáo */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">Báo Cáo Hư Hỏng & Quá Date</h1>
            <span className="px-2.5 py-0.5 bg-red-100 text-red-700 text-xs font-bold rounded-full flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> Tiêu hủy
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Thống kê chi tiết các lô trái cây quá hạn còn tồn, số tiền hao hụt vốn và tỷ lệ thất thoát.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            type="button"
            onClick={fetchReport}
            disabled={loading}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 border border-gray-200 bg-white hover:bg-gray-50 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Làm mới
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            disabled={filteredBatches.length === 0}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            Xuất Báo Cáo CSV
          </button>
        </div>
      </div>

      {/* KPI Thẻ thống kê */}
      {data && <SpoilageStatsCards summary={data.summary} />}
      {error && <p role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      {/* Thanh tìm kiếm, lọc & sắp xếp */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6 grid grid-cols-1 md:grid-cols-4 gap-3 items-center">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Tìm theo mã lô, tên quả, NCC..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="relative">
          <Filter className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <select
            value={supplierFilter}
            onChange={(e) => setSupplierFilter(e.target.value)}
            aria-label="Lọc theo nhà cung cấp"
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Tất cả nhà cung cấp</option>
            {supplierOptions.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        <div className="relative">
          <ArrowUpDown className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            aria-label="Sắp xếp"
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="totalLoss_desc">Tiền hao hụt: Cao → Thấp</option>
            <option value="totalLoss_asc">Tiền hao hụt: Thấp → Cao</option>
            <option value="daysOverdue_desc">Quá hạn lâu nhất</option>
            <option value="spoilageRate_desc">Tỷ lệ thất thoát cao nhất</option>
            <option value="expiryDate_asc">Hạn dùng cũ nhất</option>
          </select>
        </div>

        <div className="text-xs text-gray-500 font-medium md:text-right">
          Hiển thị <b>{filteredBatches.length}</b> lô hàng quá hạn
        </div>
      </div>

      {/* Bảng dữ liệu */}
      {loading ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden p-4">
          <table className="w-full">
            <tbody>
              <TableSkeleton rows={4} cols={9} />
            </tbody>
          </table>
        </div>
      ) : (
        <SpoilageTable batches={filteredBatches} />
      )}
    </div>
  );
};
