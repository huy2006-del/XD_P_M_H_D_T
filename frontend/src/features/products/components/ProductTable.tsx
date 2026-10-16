import { Product } from '../types/product.types';
import { formatCurrency } from '@/shared/utils/format';
import { ProductStatusSwitch } from './ProductStatusSwitch';
import { Button } from '@/shared/components/ui/Button';
import { SafeTempBadge } from './SafeTempBadge';
import { Spinner } from '@/shared/components/ui/Spinner';
import { EmptyState } from '@/shared/components/ui/EmptyState';

interface ProductTableProps {
  products: Product[];
  isLoading: boolean;
  togglingId?: string;
  onToggleStatus: (product: Product, next: boolean) => void;
  onEdit: (product: Product) => void;
  onView: (product: Product) => void;
}

export const ProductTable = ({
  products,
  isLoading,
  togglingId,
  onToggleStatus,
  onEdit,
  onView,
}: ProductTableProps) => {
  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <EmptyState
        icon="🍎"
        title="Chưa có sản phẩm nào"
        description="Bắt đầu bằng cách thêm sản phẩm trái cây đầu tiên cho hệ thống."
      />
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[880px] text-left text-sm">
        <thead className="border-b border-slate-100 bg-slate-50/60 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-3 font-medium">Ảnh</th>
            <th className="px-4 py-3 font-medium">Tên</th>
            <th className="px-4 py-3 font-medium">Đơn giá</th>
            <th className="px-4 py-3 font-medium">Đơn vị</th>
            <th className="px-4 py-3 font-medium">Dải nhiệt độ an toàn</th>
            <th className="px-4 py-3 font-medium">Trạng thái</th>
            <th className="px-4 py-3 text-right font-medium">Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {products.map((p) => (
            <tr key={p.id} className="border-b border-slate-100 last:border-none hover:bg-slate-50/60">
              <td className="px-4 py-3">
                <div className="h-12 w-12 overflow-hidden rounded-lg bg-slate-100 ring-1 ring-slate-200">
                  {p.imageUrl ? (
                    <img
                      src={p.imageUrl}
                      alt={p.name}
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-slate-300">
                      🍇
                    </div>
                  )}
                </div>
              </td>
              <td className="px-4 py-3">
                <div className="font-medium text-slate-900">{p.name}</div>
                <div className="text-xs text-slate-400">SKU: {p.sku}</div>
              </td>
              <td className="px-4 py-3 font-medium text-slate-800">{formatCurrency(p.price)}</td>
              <td className="px-4 py-3 text-slate-600">{p.unit}</td>
              <td className="px-4 py-3">
                <SafeTempBadge minTempC={p.minTempC} maxTempC={p.maxTempC} />
              </td>
                            <td className="px-4 py-3">
                <ProductStatusSwitch
                  isActive={p.isActive}
                  loading={togglingId === p.id}
                  onChange={(next) => onToggleStatus(p, next)}
                />
              </td>
              <td className="px-4 py-3 text-right">
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={() => onView(p)}>
                    Chi tiết
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => onEdit(p)}>
                    Sửa
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
