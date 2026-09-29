import { Badge } from '@/components/ui/badge';
import { STATUS_LABELS, type OrderStatus } from '@/lib/orders/status';

export function StatusBadge({ status }: { status: OrderStatus }) {
  return <Badge variant="secondary">{STATUS_LABELS[status].admin}</Badge>;
}
