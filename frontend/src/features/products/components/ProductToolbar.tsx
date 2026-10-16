import { useEffect, useState } from 'react';
import { Input } from '@/shared/components/ui/Input';
import { Button } from '@/shared/components/ui/Button';

export type ProductStatusFilter = 'all' | 'active' | 'inactive';
export type ProductSortOption = 'newest' | 'price_asc' | 'price_desc' | 'name_asc';

interface ProductToolbarProps {
  keyword: string;
  status: ProductStatusFilter;
  sort?: ProductSortOption;
  onKeywordChange: (value: string) => void;
  onStatusChange: (value: ProductStatusFilter) => void;
  onSortChange?: (value: ProductSortOption) => void;
  onCreate: () => void;
}

export const ProductToolbar = ({
  keyword,
  status,
  sort = 'newest',
  onKeywordChange,
  onStatusChange,
  onSortChange,
  onCreate,
}: ProductToolbarProps) => {
  const [localKeyword, setLocalKeyword] = useState(keyword);

  // Debounce search 400ms — tránh spam API mỗi lần gõ
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localKeyword.trim() !== keyword) {
        onKeywordChange(localKeyword.trim());
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [localKeyword, keyword, onKeywordChange]);

  // Sync khi parent reset keyword (VD: sau khi clear filter)
  useEffect(() => {
    setLocalKeyword(keyword);
  }, [keyword]);

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
        {/* Search */}
        <div className="relative w-full sm:max-w-xs">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            🔍
          </span>
          <Input
            placeholder="Tìm theo tên sản phẩm hoặc SKU…"
            value={localKeyword}
            onChange={(e) => setLocalKeyword(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Status filter */}
        <select
          value={status}
          onChange={(e) => onStatusChange(e.target.value as ProductStatusFilter)}
          className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
        >
          <option value="all">Tất cả trạng thái</option>
          <option value="active">Đang bán</option>
          <option value="inactive">Ngừng bán</option>
        </select>

        {/* Sort (optional) */}
        {onSortChange && (
          <select
            value={sort}
            onChange={(e) => onSortChange(e.target.value as ProductSortOption)}
            className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
          >
            <option value="newest">Mới nhất</option>
            <option value="price_asc">Giá tăng dần</option>
            <option value="price_desc">Giá giảm dần</option>
            <option value="name_asc">Tên A→Z</option>
          </select>
        )}
      </div>

      <Button onClick={onCreate}>+ Thêm sản phẩm mới</Button>
    </div>
  );
};
