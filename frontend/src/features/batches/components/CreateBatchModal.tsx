import React, { useState } from 'react';
import type { CreateBatchRequest } from '../types';
import { generateLotCode } from '../../../shared/utils/dateUtils';

interface ProductOption { id: number; name: string; }

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateBatchRequest) => Promise<void>;
  products: ProductOption[];
}

export const CreateBatchModal: React.FC<Props> = ({ isOpen, onClose, onSubmit, products }) => {
  const [formData, setFormData] = useState<CreateBatchRequest>({
    productId: 0,
    batchCode: '',
    supplier: '',
    expiryDate: '',
    quantityImported: 0,
    unitCost: 0
  });
  const [errorMsg, setErrorMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    // Validation
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = formData.expiryDate ? new Date(`${formData.expiryDate}T00:00:00`) : null;
    if (!expiry || expiry <= today) {
      setErrorMsg('Ngày hết hạn phải lớn hơn ngày hiện tại!');
      return;
    }
    if (!Number.isSafeInteger(formData.productId) || formData.productId <= 0) {
      setErrorMsg('Vui lòng chọn sản phẩm.');
      return;
    }
    if (!Number.isSafeInteger(formData.quantityImported) || formData.quantityImported <= 0) {
      setErrorMsg('Số lượng nhập phải là số nguyên lớn hơn 0.');
      return;
    }
    const batchCode = formData.batchCode.trim();
    const supplier = formData.supplier.trim();
    if (!batchCode || batchCode.length > 50) {
      setErrorMsg('Mã lô không được để trống và tối đa 50 ký tự.');
      return;
    }
    if (supplier.length > 150) {
      setErrorMsg('Tên nhà cung cấp tối đa 150 ký tự.');
      return;
    }
    if (!Number.isFinite(formData.unitCost) || formData.unitCost < 0) {
      setErrorMsg('Giá vốn phải là số hợp lệ không âm.');
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({ ...formData, batchCode, supplier });
      onClose();
      // Reset form
      setFormData({ productId: 0, batchCode: '', supplier: '', expiryDate: '', quantityImported: 0, unitCost: 0 });
    } catch (error: unknown) {
      setErrorMsg(
        error instanceof Error ? error.message : 'Không thể tạo lô hàng.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">Nhập Lô Hàng Mới</h2>
        
        {errorMsg && <div className="text-red-500 text-sm mb-3">{errorMsg}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="batch-product" className="block text-sm font-medium mb-1">Sản phẩm</label>
            <select id="batch-product" required className="w-full border p-2 rounded"
              value={formData.productId || ''}
              onChange={e => setFormData({...formData, productId: Number(e.target.value)})}>
              <option value="">-- Chọn sản phẩm --</option>
              {products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
            </select>
            {products.length === 0 && <p className="mt-1 text-xs text-amber-700">Không tải được sản phẩm hoặc chưa có sản phẩm. Hãy tải danh mục trước khi nhập lô.</p>}
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
            <button type="button" onClick={onClose} disabled={submitting} className="px-4 py-2 border rounded hover:bg-gray-50 disabled:opacity-50">Hủy</button>
            <button type="submit" disabled={products.length === 0 || submitting} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">{submitting ? 'Đang lưu...' : 'Lưu Lô Hàng'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};
