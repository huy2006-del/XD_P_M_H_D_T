import { Switch } from '@/shared/components/ui/Switch';
import { Badge } from '@/shared/components/ui/Badge';

interface ProductStatusSwitchProps {
  isActive: boolean;
  loading?: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
}

export const ProductStatusSwitch = ({
  isActive,
  loading,
  disabled,
  onChange,
}: ProductStatusSwitchProps) => {
  const isBusy = loading || disabled;

  return (
    <div className="flex items-center gap-2">
      <Switch
        checked={isActive}
        disabled={isBusy}
        onCheckedChange={onChange}
        aria-label={isActive ? 'Ngừng kinh doanh sản phẩm' : 'Bật kinh doanh sản phẩm'}
      />
      {loading ? (
        <span className="text-xs text-slate-400">Đang lưu…</span>
      ) : isActive ? (
        <Badge tone="success">Đang bán</Badge>
      ) : (
        <Badge tone="neutral">Ngừng bán</Badge>
      )}
    </div>
  );
};
