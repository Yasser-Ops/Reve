import { STATUS_LABELS, type OrderStatus } from '@/lib/orders/status';
import { cn } from '@/lib/utils';

const EARLY = 'bg-secondary text-secondary-foreground';

/* A plain span, not shadcn's Badge: its variant classes would fight these.
   Early stages recede; the stage waiting on the client (review) is wine;
   delivered is the one solid mark. */
const TONE: Record<OrderStatus, string> = {
  pending_payment: EARLY,
  paid: EARLY,
  brief: EARLY,
  concept: EARLY,
  in_design: 'bg-taupe/25 text-cocoa',
  review: 'bg-wine/10 text-wine',
  delivered: 'bg-ink text-bone',
  cancelled: 'text-muted-foreground line-through',
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span
      className={cn(
        'inline-flex h-6 items-center rounded-full px-2.5 font-sans text-[12px] font-medium whitespace-nowrap',
        TONE[status],
      )}
      data-status={status}
    >
      {STATUS_LABELS[status].admin}
    </span>
  );
}
