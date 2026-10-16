
import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { Product } from '../types/product.types';
import { SAFE_TEMP_MIN, SAFE_TEMP_MAX } from '../types/product.types';
import { Badge } from '@/shared/components/ui/Badge';
import { Button } from '@/shared/components/ui/Button';
import { formatCurrency } from '@/shared/utils/format';
import { cn } from '@/shared/utils/cn';

interface ProductDetailDrawerProps {
  open: boolean;
  product?: Product | null;
  onClose: () => void;
  onEdit: (product: Product) => void;
}

export const ProductDetailDrawer = ({
  open,
  product,
  onClose,
  onEdit,
}: ProductDetailDrawerProps) => {
  // ESC đóng drawer
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open || !product) return null;

  // Kiểm tra dải nhiệt có nằm trong chuẩn an toàn 2–8°C hay không
  const isTempSafe =
    product.minTempC >= SAFE_TEMP_MIN && product.maxTempC <= SAFE_TEMP_MAX;

  return createPortal(
    <div className="fixed inset-0 z-50 flex">
      {/* Overlay */}
      <div
        className="flex-1 bg-slate-900/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />

      {/* Drawer */}
      <aside
        role="dialog"
        aria-modal="true"
        className="flex h-full w-full max-w-md flex-col bg-white shadow-2xl"
      >
        {/* Header */}
        <header className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="text-lg font-semibold text-slate-900">Chi tiết sản phẩm</h2>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Đóng">
            ✕
          </Button>
        </header>

        {/* Body */}
        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
          {/* Ảnh */}
          <div className="mx-auto aspect-video w-full max-w-sm overflow-hidden rounded-xl bg-slate-100 ring-1 ring-slate-200">
            {product.imageUrl ? (
              <img
                src={product.imageUrl}
                alt={product.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-5xl text-slate-300">
                🍇
              </div>
            )}
          </div>

          {/* Tên + SKU + Badge trạng thái */}
          <div className="space-y-1">
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-xl font-semibold text-slate-900">{product.name}</h3>
              {product.isActive ? (
                <Badge tone="success">Đang bán</Badge>
              ) : (
                <Badge tone="neutral">Ngừng bán</Badge>
              )}
            </div>
            <p className="text-sm text-slate-500">SKU: {product.sku}</p>
          </div>

          {/* Giá + Đơn vị */}
          <div className="grid grid-cols-2 gap-3">
            <InfoBox label="Đơn giá" value={formatCurrency(product.price)} />
            <InfoBox label="Đơn vị" value={product.unit} />
          </div>

          {/* Chuỗi lạnh — trọng tâm đề tài */}
          <section className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h4 className="text-sm font-semibold text-slate-700">
                Bảo quản chuỗi lạnh
              </h4>
              <Badge tone={isTempSafe ? 'info' : 'warning'}>
                {isTempSafe ? 'Đạt chuẩn 2–8°C' : 'Ngoài dải tiêu chuẩn'}
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <InfoBox label="Tmin" value={`${product.minTempC}°C`} />
              <InfoBox label="Tmax" value={`${product.maxTempC}°C`} />
            </div>
            <p className="mt-3 text-xs text-slate-500">
              Hạn sử dụng chuẩn: <b>{product.shelfLifeDays} ngày</b> · Ngưỡng an toàn
              toàn quốc: {SAFE_TEMP_MIN}°C – {SAFE_TEMP_MAX}°C
            </p>
          </section>

          {/* Mô tả */}
          {product.description && (
            <section className="space-y-1.5">
              <h4 className="text-sm font-semibold text-slate-700">Mô tả</h4>
              <p className="whitespace-pre-line text-sm text-slate-600">
                {product.description}
              </p>
            </section>
          )}
        </div>

        {/* Footer actions */}
        <footer className="flex justify-end gap-2 border-t border-slate-100 px-5 py-4">
          <Button variant="outline" onClick={onClose}>
            Đóng
          </Button>
          <Button onClick={() => onEdit(product)}>Chỉnh sửa</Button>
        </footer>
      </aside>
    </div>,
    document.body
  );
};


const InfoBox = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
    <div className="text-xs text-slate-500">{label}</div>
    <div className={cn('mt-0.5 text-sm font-semibold text-slate-800')}>{value}</div>
  </div>
);
