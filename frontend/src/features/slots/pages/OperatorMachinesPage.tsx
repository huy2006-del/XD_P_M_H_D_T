import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, LayoutGrid, MapPin, RefreshCw } from 'lucide-react';
import axios from 'axios';
import axiosInstance from '../../../shared/api/axiosInstance';
import { useAuthStore } from '../../auth/authStore';

interface OperatorMachine {
  id: number;
  name: string;
  serialNumber: string;
  status: string;
  locationName?: string | null;
  operator?: { id: number; fullName?: string | null } | null;
}

export function OperatorMachinesPage() {
  const user = useAuthStore((state) => state.userProfile);
  const [machines, setMachines] = useState<OperatorMachine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMachines = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await axiosInstance.get<OperatorMachine[]>('/api/v1/machines');
      setMachines(Array.isArray(data) ? data : []);
    } catch (requestError: unknown) {
      setError(
        axios.isAxiosError<{ message?: string }>(requestError)
          ? requestError.response?.data?.message ?? requestError.message
          : 'Không thể tải danh sách máy được giao.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchMachines();
  }, [fetchMachines]);

  const assignedMachines = useMemo(() => {
    const operatorId = Number(user?.id);
    if (!Number.isSafeInteger(operatorId) || operatorId <= 0) return [];
    return machines.filter((machine) => machine.operator?.id === operatorId);
  }, [machines, user?.id]);

  return (
    <main className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Máy được giao</h1>
          <p className="mt-1 text-sm text-gray-500">Xem sơ đồ và tồn kho khay của các máy phụ trách.</p>
        </div>
        <button
          type="button"
          onClick={() => void fetchMachines()}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Làm mới
        </button>
      </header>

      {error && (
        <div role="alert" className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertTriangle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-xl border border-gray-100 bg-white p-12 text-center text-sm text-gray-500">Đang tải máy được giao...</div>
      ) : assignedMachines.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 bg-white p-12 text-center">
          <LayoutGrid className="mx-auto mb-3 h-8 w-8 text-gray-300" />
          <h2 className="font-semibold text-gray-800">Chưa có máy được giao</h2>
          <p className="mt-1 text-sm text-gray-500">Danh sách hiển thị các máy có Operator ID khớp tài khoản đang đăng nhập.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {assignedMachines.map((machine) => (
            <article key={machine.id} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-bold text-gray-900">{machine.name}</h2>
                  <p className="mt-1 font-mono text-xs text-gray-500">{machine.serialNumber}</p>
                </div>
                <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700">{machine.status}</span>
              </div>
              <p className="mt-4 flex items-center gap-1.5 text-sm text-gray-600">
                <MapPin className="h-4 w-4 text-gray-400" /> {machine.locationName || 'Chưa cập nhật vị trí'}
              </p>
              <Link
                to={`/operator/machines/${machine.id}/slots`}
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                <LayoutGrid className="h-4 w-4" /> Xem sơ đồ khay
              </Link>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}

export default OperatorMachinesPage;
