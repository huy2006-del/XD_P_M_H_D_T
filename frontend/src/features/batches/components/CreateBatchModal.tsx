import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Package, Calendar, DollarSign, Truck, Hash, AlertCircle } from 'lucide-react';
import type { CreateBatchRequest, FruitBatch } from '../types';
import { productsApi } from '../../products/api/products.api';
import type { Product } from '../../products/types/product.types';
import { generateLotCode, getDaysUntilExpiry, toLocalDateInputValue } from '../../../shared/utils/dateUtils';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateBatchRequest) => Promise<FruitBatch>;
}

export const CreateBatchModal: React.FC<Props> = ({ isOpen, onClose, onSubmit }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState<boolean>(false);
  const [productsError, setProductsError] = useState('');

  const [formData, setFormData] = useState<CreateBatchRequest>({
    productId: 0,
    batchCode: '',
    supplier: '',
    expiryDate: '',
    quantityImported: 100,
    unitCost: 25000,
  });

  const [errorMsg, setErrorMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Tải danh sách sản phẩm đang hoạt động để người dùng chọn
  useEffect(() => {
    if (!isOpen) return;

    let active = true;
    setLoadingProducts(true);
    setProductsError('');

    productsApi
      .list({ page: 0, size: 100, isActive: true })
      .then((res) => {
        if (!active) return;
        const list = res.content || [];
        setProducts(list);
        if (list.length > 0 && formData.productId === 0) {
          setFormData((prev) => ({
            ...prev,
            productId: Number(list[0].id),
            batchCode: prev.batchCode || generateLotCode(),
          }));
        }
      })
      .catch((err) => {
        console.error('Không thể tải danh sách sản phẩm:', err);
        if (active) setProductsError('Không tải được sản phẩm. Hãy thử lại trước khi lưu lô.');
      })
      .finally(() => {
        if (active) setLoadingProducts(false);
      });

    return () => {
      active = false;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!formData.productId || formData.productId <= 0) {
      setErrorMsg('Vui lòng chọn sản phẩm cho lô hàng.');
      return;
    }

    if (!formData.batchCode.trim()) {
      setErrorMsg('Mã lô không được để trống.');
      return;
    }

    if (!formData.expiryDate) {
      setErrorMsg('Vui lòng chọn ngày hết hạn.');
      return;
    }

    if (getDaysUntilExpiry(formData.expiryDate) <= 0) {
      setErrorMsg('Hạn sử dụng phải lớn hơn ngày hiện tại!');
      return;
    }

    if (!formData.quantityImported || formData.quantityImported <= 0) {
      setErrorMsg('Số lượng nhập phải lớn hơn 0.');
      return;
    }

    if (formData.unitCost < 0) {
      setErrorMsg('Giá vốn không được là số âm.');
      return;
    }

    try {
      setSubmitting(true);
      const created = await onSubmit(formData);
      toast.success(`Đã nhập thành công lô hàng ${created?.batchCode || formData.batchCode}!`);
      onClose();
      // Reset form
      setFormData({
        productId: products.length > 0 ? Number(products[0].id) : 0,
        batchCode: generateLotCode(),
        supplier: '',
        expiryDate: '',
        quantityImported: 100,
        unitCost: 25000,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Không thể tạo lô hàng.';
      setErrorMsg(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleGenerateCode = () => {
    setFormData((prev) => ({ ...prev, batchCode: generateLotCode() }));
  };

  const earliestExpiry = new Date();
  earliestExpiry.setDate(earliestExpiry.getDate() + 1);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-100">
        {/* Header */}
        <div className="bg-emerald-600 px-6 py-4 text-white flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            <h2 className="text-lg font-bold">Nhập Lô Hàng Mới</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="text-white/80 hover:text-white text-xl font-bold cursor-pointer"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Chọn Sản Phẩm */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Sản phẩm liên kết <span className="text-red-500">*</span>
            </label>
            {loadingProducts ? (
              <div className="text-sm text-gray-500 py-2">Đang tải danh sách sản phẩm...</div>
            ) : (
              <select
                required
                className="w-full border border-gray-300 rounded-lg p-2.5 text-sm bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                value={formData.productId}
                onChange={(e) => setFormData({ ...formData, productId: Number(e.target.value) })}
              >
                <option value={0}>-- Chọn sản phẩm trái cây --</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} · {p.sku || `#${p.id}`}
                  </option>
                ))}
              </select>
            )}
            {productsError && <p role="alert" className="mt-1 text-xs text-red-600">{productsError}</p>}
            <p className="text-xs text-gray-400 mt-1">
              Khay bán hàng sẽ chỉ chấp nhận lô có đúng sản phẩm đã gán cho khay.
            </p>
          </div>

          {/* Mã Lô */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Mã Lô (Batch Code) <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Hash className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: LOT-20261123-01"
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  value={formData.batchCode}
                  onChange={(e) => setFormData({ ...formData, batchCode: e.target.value })}
                />
              </div>
              <button
                type="button"
                onClick={handleGenerateCode}
                className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-lg transition-colors"
              >
                Tự sinh mã
              </button>
            </div>
          </div>

          {/* Nhà Cung Cấp */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Nhà cung cấp / Nguồn nhập
            </label>
            <div className="relative">
              <Truck className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Ví dụ: Nông trại BioFresh Đà Lạt, VinEco..."
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                value={formData.supplier}
                onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
              />
            </div>
          </div>

          {/* Hạn Sử Dụng */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Hạn sử dụng (Expiry Date) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Calendar className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="date"
                required
                min={toLocalDateInputValue(earliestExpiry)}
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                value={formData.expiryDate}
                onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
              />
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Hệ thống bán hàng áp dụng thuật toán FEFO (ưu tiên lô cận date nhất).
            </p>
          </div>

          {/* Số Lượng & Giá Vốn */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Số lượng nhập <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                value={formData.quantityImported || ''}
                onChange={(e) => setFormData({ ...formData, quantityImported: Number(e.target.value) })}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Giá vốn đơn vị (VNĐ) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <DollarSign className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="number"
                  min="0"
                  required
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  value={formData.unitCost || ''}
                  onChange={(e) => setFormData({ ...formData, unitCost: Number(e.target.value) })}
                />
              </div>
            </div>
          </div>

          {/* Footer nút hành động */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-bold shadow-md hover:shadow-lg disabled:opacity-50 transition-all"
            >
              {submitting ? 'Đang lưu lô hàng...' : 'Lưu Lô Hàng'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
