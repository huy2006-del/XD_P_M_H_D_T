import { useEffect, useMemo, useState } from 'react';
import { ArrowDownToLine, Calendar, LoaderCircle, RefreshCw, Search } from 'lucide-react';
import { useRestockHistory } from '../hooks/useRestockHistory';

function formatTimestamp(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat('vi-VN', {
        dateStyle: 'short',
        timeStyle: 'short',
      }).format(date);
}

export function RestockHistoryPage() {
  const { history, loading, error, refresh } = useRestockHistory();
  const [operatorFilter, setOperatorFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const filteredHistory = useMemo(() => history.filter((entry) => {
    const operatorMatches = entry.operatorUsername.toLowerCase().includes(operatorFilter.trim().toLowerCase());
    const entryTime = new Date(entry.timestamp).getTime();
    const start = startDate ? new Date(`${startDate}T00:00:00`).getTime() : null;
    const end = endDate ? new Date(`${endDate}T23:59:59.999`).getTime() : null;
    return operatorMatches && (!start || entryTime >= start) && (!end || entryTime <= end);
  }), [history, operatorFilter, startDate, endDate]);

  return (
    <main className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Lịch sử tiếp hàng</h1>
          <p className="mt-1 text-sm text-gray-500">Các phiên tiếp hàng đã hoàn tất.</p>
        </div>
        <button
          type="button"
          onClick={() => void refresh()}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Làm mới
        </button>
      </header>

      {error && (
        <div role="alert" className="flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 sm:flex-row sm:items-center sm:justify-between">
          <span>{error}</span>
          <button type="button" onClick={() => void refresh()} className="font-semibold underline">
            Thử lại
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 rounded-xl border border-gray-100 bg-white p-4 shadow-sm sm:grid-cols-3">
        <label className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            value={operatorFilter}
            onChange={(event) => setOperatorFilter(event.target.value)}
            placeholder="Lọc theo mã người thực hiện"
            className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-sm"
          />
        </label>
        <label className="relative">
          <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} aria-label="Từ ngày" className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-sm" />
        </label>
        <label className="relative">
          <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} aria-label="Đến ngày" className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-sm" />
        </label>
      </div>

      <section className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        {loading && history.length === 0 ? (
          <div className="flex min-h-56 items-center justify-center gap-2 text-sm text-gray-500">
            <LoaderCircle className="h-5 w-5 animate-spin" /> Đang tải lịch sử...
          </div>
        ) : filteredHistory.length === 0 ? (
          <div className="flex min-h-56 flex-col items-center justify-center px-6 text-center">
            <ArrowDownToLine className="mb-3 h-8 w-8 text-gray-300" />
            <h2 className="font-semibold text-gray-800">Chưa có lịch sử tiếp hàng</h2>
            <p className="mt-1 text-sm text-gray-500">Các lần tiếp hàng hoàn tất sẽ xuất hiện tại đây.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">Thời gian</th>
                  <th className="px-5 py-3 font-semibold">Người thực hiện</th>
                  <th className="px-5 py-3 font-semibold">Chi tiết</th>
                  <th className="px-5 py-3 font-semibold">Khay</th>
                  <th className="px-5 py-3 text-right font-semibold">Số lượng</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredHistory.map((entry) => (
                  <tr key={entry.id} className="text-gray-700">
                    <td className="whitespace-nowrap px-5 py-4">{formatTimestamp(entry.timestamp)}</td>
                    <td className="px-5 py-4">{entry.operatorUsername || '—'}</td>
                    <td className="px-5 py-4">
                      <div>{entry.details}</div>
                      {entry.batchCode && <div className="mt-1 text-xs text-gray-500">Lô: {entry.batchCode}</div>}
                    </td>
                    <td className="px-5 py-4">{entry.slotCode || '—'}</td>
                    <td className="px-5 py-4 text-right">{entry.quantity ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
