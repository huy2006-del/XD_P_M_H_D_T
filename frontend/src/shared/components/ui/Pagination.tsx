import { Button } from './Button';

interface PaginationProps {
  page: number; // 1-based
  totalPages: number;
  totalElements: number;
  onPageChange: (page: number) => void;
}

export const Pagination = ({ page, totalPages, totalElements, onPageChange }: PaginationProps) => {
  const from = totalElements === 0 ? 0 : (page - 1) * 10 + 1;
  const to = Math.min(page * 10, totalElements);

  return (
    <div className="flex items-center justify-between gap-4 border-t border-slate-100 px-4 py-3 text-sm text-slate-600">
      <span>
        Hiển thị <b>{from}</b>–<b>{to}</b> trên <b>{totalElements}</b> sản phẩm
      </span>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          Trước
        </Button>
        <span className="px-2">
          Trang <b>{page}</b> / {totalPages || 1}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Sau
        </Button>
      </div>
    </div>
  );
};
