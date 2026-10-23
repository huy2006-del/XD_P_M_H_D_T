import React, { useState } from 'react';
import { useBatches } from '../hooks/useBatches';
import { BatchTable } from '../components/BatchTable';
import { CreateBatchModal } from '../components/CreateBatchModal';

export const BatchManagementPage: React.FC = () => {
  const { batches, loading, createBatch } = useBatches();
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Quản Lý Lô Hàng Nhập Kho</h1>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700"
        >
          + Nhập Lô Mới
        </button>
      </div>

      {loading ? (
        <div className="text-center py-10">Đang tải dữ liệu...</div>
      ) : (
        <BatchTable batches={batches} />
      )}

      <CreateBatchModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSubmit={createBatch} 
      />
    </div>
  );
};
