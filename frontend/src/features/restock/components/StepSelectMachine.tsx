import React, { useEffect, useState } from 'react';
import axios from 'axios';
import axiosInstance from '../../../shared/api/axiosInstance';
import type { Machine } from '../types';

interface Props {
  onSelect: (machine: Machine) => void;
}

export const StepSelectMachine: React.FC<Props> = ({ onSelect }) => {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    axiosInstance.get<Machine[]>('/api/v1/machines')
      .then(({ data }) => {
        if (active) setMachines(data);
      })
      .catch((requestError: unknown) => {
        if (active) {
          setError(
            axios.isAxiosError<{ message?: string }>(requestError)
              ? requestError.response?.data?.message ?? requestError.message
              : 'Không thể tải danh sách máy.'
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  if (loading) return <div className="p-4 text-center">Đang tải danh sách máy...</div>;

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Bước 1: Chọn máy cần tiếp hàng</h2>
      {error && <p role="alert" className="mb-4 text-red-700">{error}</p>}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {machines.map(m => {
          return (
            <button
              type="button"
              key={m.id}
              onClick={() => onSelect(m)}
              className="w-full border border-gray-200 rounded-lg p-4 text-left cursor-pointer transition shadow-sm hover:shadow-md bg-white"
            >
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-bold text-lg">{m.name}</h3>
                <span className="px-2 py-1 rounded text-xs font-semibold bg-gray-100 text-gray-800">
                  {m.status}
                </span>
              </div>
              <p className="text-sm text-gray-600 mb-1">{m.serialNumber}</p>
              <p className="text-sm text-gray-600">{m.locationName}</p>
            </button>
          );
        })}
      </div>
      {!error && machines.length === 0 && (
        <p className="py-6 text-center text-gray-500">Chưa có máy nào trong hệ thống.</p>
      )}
    </div>
  );
};