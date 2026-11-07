import React, { useEffect, useState, useCallback } from 'react';
import { RefreshCw, Download, Search, AlertTriangle } from 'lucide-react';
import { spoilageService } from '../spoilageService';
import { SpoilageStatsCards } from '../components/SpoilageStatsCards';
import { SpoilageTable } from '../components/SpoilageTable';
import { TableSkeleton } from '../../../shared/components/ui/Skeleton';
import type { SpoilageReportResponse } from '../types';

export const SpoilageReportPage: React.FC = () => {
  const [data, setData] = useState<SpoilageReportResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');

  const fetchReport = useCallback(async () => {
    try {
      setLoading(true);
      const res = await spoilageService.getSpoilageReport({ search });
      setData(res);
    } catch (err) {
      console.error('Lỗi khi tải báo cáo hao hụt:', err);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const handleExportCSV = () => {
    if (data?.batches) {
      spoilageService.exportSpoilageCSV(data.batches);
    }
  };

  const filteredBatches = data?.batches.filter((b) =>
    b.batchCode.toLowerCase().includes(search.toLowerCase()) ||
    b.productName.toLowerCase().includes(search.toLowerCase()) ||
    b.supplier.toLowerCase().includes(search.toLowerCase())
  ) || [];

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
            Thống kê chi tiết các lô trái cây quá hạn, số tiền hao hụt vốn và tỷ lệ thất thoát.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={fetchReport}
            disabled={loading}
            className="flex items-center justify-center gap-2 border border-gray-200 bg-white hover:bg-gray-50 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Làm mới
          </button>

          <button
            onClick={handleExportCSV}
            disabled={!data || data.batches.length === 0}
            className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            Xuất Báo Cáo CSV
          </button>
        </div>
      </div>

      {/* KPI Thẻ thống kê */}
      {data && <SpoilageStatsCards summary={data.summary} />}

      {/* Thanh tìm kiếm */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6 flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Tìm theo mã lô, tên quả, nhà cung cấp..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="text-xs text-gray-500 font-medium">
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
