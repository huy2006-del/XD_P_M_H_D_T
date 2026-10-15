import { Badge } from '@/shared/components/ui/Badge';

export const ProductStatusBadge = ({ isActive }: { isActive: boolean }) =>
  isActive ? <Badge tone="success">Đang bán</Badge> : <Badge tone="neutral">Ngừng bán</Badge>;
