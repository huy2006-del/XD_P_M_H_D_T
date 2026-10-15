import { Badge } from '@/shared/components/ui/Badge';
import { SAFE_TEMP_MAX, SAFE_TEMP_MIN } from '../types/product.types';

interface Props {
  minTempC: number;
  maxTempC: number;
}

export const SafeTempBadge = ({ minTempC, maxTempC }: Props) => {
  // Cảnh báo nếu dải nhiệt vượt chuẩn an toàn 2–8°C
  const isWithinStandard = minTempC >= SAFE_TEMP_MIN && maxTempC <= SAFE_TEMP_MAX;
  return (
    <Badge tone={isWithinStandard ? 'info' : 'warning'}>
      {minTempC}°C – {maxTempC}°C
    </Badge>
  );
};
