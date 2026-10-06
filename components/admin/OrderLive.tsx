'use client';

import { useRouter } from 'next/navigation';
import { useOptimistic, useState, useTransition, type ReactNode } from 'react';
import { Eyebrow } from '@/components/admin/Eyebrow';
import { OrderMenu } from '@/components/admin/OrderMenu';
import { StageStepper } from '@/components/admin/StageStepper';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { moveOrder } from '@/lib/admin/order-actions';
import { TIER_LABELS, type Tier } from '@/lib/constants';
import {
  ORDER_STATUS,
  STATUS_LABELS,
  allowedMoves,
  nextMove,
  previousMove,
  type OrderStatus,
} from '@/lib/orders/status';

type OrderLiveProps = {
  orderId: string;
  reference: string;
  tier: Tier;
  status: OrderStatus;
  amount: number;
  /** Formatted on the server, so server and client render the same text. */
  dueLabel: string | null;
  upgrades: readonly Tier[];
  /** Server-rendered parts of the card: provisioning, the invitation row. */
  children?: ReactNode;
};

/**
 * The part of an order card that moves. A move shows its new stage at once
 * (useOptimistic) while moveOrder saves; the server's re-render then becomes
 * the truth. A refusal ends the transition, the stage falls back to the
 * server's, and the reason is shown.
 */
export function OrderLive({
  orderId,
  reference,
  tier,
  status: savedStatus,
  amount,
  dueLabel,
  upgrades,
  children,
}: OrderLiveProps) {
  const [status, showStatus] = useOptimistic(savedStatus);
  const [moving, startMove] = useTransition();
  const [refusal, setRefusal] = useState<string | null>(null);
  const router = useRouter();

  function move(to: OrderStatus) {
    /* Outside the transition: inside it, clearing waits for the save. */
    setRefusal(null);
    startMove(async () => {
      showStatus(to);
      const formData = new FormData();
      formData.set('orderId', orderId);
      formData.set('to', to);
      const result = await moveOrder(null, formData);
      if (!result.ok) {
        setRefusal(result.message);
        /* A refusal often means the card is stale (moved in another tab). */
        router.refresh();
      }
    });
  }

  const forward = nextMove(tier, status);

  return (
    <article className="grid gap-5 rounded-2xl border bg-card p-5 sm:p-6">
      <header className="flex items-start justify-between gap-4">
        <div className="grid gap-1.5">
          <Eyebrow>Order {reference}</Eyebrow>
          <p className="flex flex-wrap items-center gap-3 font-heading text-[22px]">
            {TIER_LABELS[tier]} · ${amount}
            <StatusBadge status={status} />
          </p>
          {dueLabel ? <p className="text-muted-foreground">Due {dueLabel}</p> : null}
        </div>
        <OrderMenu
          amount={amount}
          back={previousMove(tier, status)}
          canCancel={allowedMoves(tier, status).includes(ORDER_STATUS.CANCELLED)}
          disabled={moving}
          onMove={move}
          orderId={orderId}
          reference={reference}
          upgrades={upgrades}
        />
      </header>

      <StageStepper status={status} tier={tier} />

      {refusal ? (
        <Alert variant="destructive">
          <AlertDescription>{refusal}</AlertDescription>
        </Alert>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        {forward ? (
          <Button disabled={moving} onClick={() => move(forward)} type="button">
            Move to {STATUS_LABELS[forward].admin}
          </Button>
        ) : status === ORDER_STATUS.REVIEW ? (
          <p className="text-muted-foreground">Publishing the invitation delivers this order.</p>
        ) : null}
      </div>

      {children}
    </article>
  );
}
