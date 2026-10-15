import { useEffect, useState } from 'react';
import { Input } from '@/shared/components/ui/Input';
import { Button } from '@/shared/components/ui/Button';

export type StatusFilter = 'all' | 'active' | 'inactive';

interface ProductFiltersProps {
  keyword: string;
  status: StatusFilter;
  onKeywordChange: (v: string) => void;
  onStatusChange: (v: StatusFilter) => void;
  onCreate: () => void;
}

export const ProductFilters = ({
  keyword,
  status,
  onKeywordChange,
  onStatusChange,
  onCreate,
}: ProductFiltersProps) => {
  const [localKw, setLocalKw] = useState(keyword);

  // Debounce keyword
  useEffect(() => {
    const t = setTimeout(() => onKeywordChange(localKw.trim()), 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localKw]);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative w-full sm:max-w-xs">
          <Input
            placeholder="Tìm theo tên sản phẩm…"
            value={localKw}
            onChange={(e) => setLocalKw(e.target.value)}
          />
        </div>
        <select
          value={status}
          onChange={(e) => onStatusChange(e.target.value as StatusFilter)}
          className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
        >
          <option value="all">Tất cả trạng thái</option>
          <option value="active">Đang bán</option>
          <option value="inactive">Ngừng bán</option>
        </select>
      </div>
      <Button onClick={onCreate}>+ Thêm sản phẩm mới</Button>
    </div>
  );
};
