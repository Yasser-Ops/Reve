import type { Tier } from '@/lib/constants';
import { ORDER_STATUS, STATUS_LABELS, flowFor, type OrderStatus } from '@/lib/orders/status';
import { cn } from '@/lib/utils';

type StepState = 'done' | 'current' | 'todo' | 'off';

const BAR: Record<StepState, string> = {
  done: 'bg-ink',
  current: 'bg-wine',
  todo: 'bg-sand',
  off: 'bg-sand',
};

/** The tier's stages, and the order's place among them. */
export function StageStepper({ tier, status }: { tier: Tier; status: OrderStatus }) {
  const flow = flowFor(tier);
  const at = flow.indexOf(status);
  const cancelled = status === ORDER_STATUS.CANCELLED;

  return (
    <ol aria-label="Order stages" className="grid grid-flow-col gap-1.5">
      {flow.map((stage, index) => {
        const state: StepState = cancelled
          ? 'off'
          : index < at
            ? 'done'
            : index === at
              ? 'current'
              : 'todo';
        return (
          <li
            aria-current={state === 'current' ? 'step' : undefined}
            className="grid gap-1.5"
            data-state={state}
            key={stage}
          >
            <span className={cn('h-1.5 rounded-full', BAR[state])} />
            {/* In the DOM at every width; only shown from sm up. */}
            <span
              className={cn(
                'hidden text-[11px] sm:block',
                state === 'current' ? 'text-foreground' : 'text-muted-foreground',
              )}
            >
              {STATUS_LABELS[stage].admin}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
