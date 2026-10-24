import React, { useState } from 'react';
import type { CreateBatchRequest } from '../types';
import { generateLotCode } from '../../../shared/utils/dateUtils';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateBatchRequest) => Promise<void>;
}

export const CreateBatchModal: React.FC<Props> = ({ isOpen, onClose, onSubmit }) => {
  const [formData, setFormData] = useState<CreateBatchRequest>({
    productId: 0,
    batchCode: '',
    supplier: '',
    expiryDate: '',
    quantityImported: 0,
    unitCost: 0
  });
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    // Validation
    if (!formData.expiryDate || new Date(formData.expiryDate) <= new Date()) {
      setErrorMsg('Ngày hết hạn phải lớn hơn ngày hiện tại!');
      return;
    }

    try {
      await onSubmit(formData);
      onClose();
      // Reset form
      setFormData({ productId: 0, batchCode: '', supplier: '', expiryDate: '', quantityImported: 0, unitCost: 0 });
    } catch (error: any) {
      setErrorMsg(error.message);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">Nhập Lô Hàng Mới</h2>
        
        {errorMsg && <div className="text-red-500 text-sm mb-3">{errorMsg}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Tạm dùng input number cho Product ID, thực tế bạn nên dùng Select dropdown gọi API products */}
          <div>
            <label className="block text-sm font-medium mb-1">Mã Sản Phẩm (Product ID)</label>
            <input type="number" required className="w-full border p-2 rounded" 
              value={formData.productId || ''} 
              onChange={e => setFormData({...formData, productId: Number(e.target.value)})} />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Mã Lô (Batch Code)</label>
            <div className="flex gap-2">
              <input type="text" required className="w-full border p-2 rounded" 
                value={formData.batchCode} 
                onChange={e => setFormData({...formData, batchCode: e.target.value})} />
              <button type="button" onClick={() => setFormData({...formData, batchCode: generateLotCode()})} 
                className="bg-gray-200 px-3 rounded text-sm hover:bg-gray-300">Tự sinh</button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Nhà Cung Cấp</label>
            <input type="text" required className="w-full border p-2 rounded" 
              value={formData.supplier} 
              onChange={e => setFormData({...formData, supplier: e.target.value})} />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Hạn Sử Dụng</label>
            <input type="date" required className="w-full border p-2 rounded" 
              value={formData.expiryDate} 
              onChange={e => setFormData({...formData, expiryDate: e.target.value})} />
          </div>

          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1">Số Lượng Nhập</label>
              <input type="number" min="1" required className="w-full border p-2 rounded" 
                value={formData.quantityImported || ''} 
                onChange={e => setFormData({...formData, quantityImported: Number(e.target.value)})} />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1">Giá Vốn (VNĐ)</label>
              <input type="number" min="0" required className="w-full border p-2 rounded" 
                value={formData.unitCost || ''} 
                onChange={e => setFormData({...formData, unitCost: Number(e.target.value)})} />
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <button type="button" onClick={onClose} className="px-4 py-2 border rounded hover:bg-gray-50">Hủy</button>
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Lưu Lô Hàng</button>
          </div>
        </form>
      </div>
    </div>
  );
};
