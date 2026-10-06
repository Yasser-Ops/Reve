'use client';

import { MoreHorizontal } from 'lucide-react';
import { useState } from 'react';
import { ActionForm } from '@/components/admin/ActionForm';
import { Field } from '@/components/admin/fields';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { NativeSelect } from '@/components/ui/native-select';
import { applyUpgrade } from '@/lib/admin/order-actions';
import { TIER_LABELS, type Tier } from '@/lib/constants';
import { ORDER_STATUS, STATUS_LABELS, type OrderStatus } from '@/lib/orders/status';

type Pending = 'back' | 'upgrade' | 'cancel' | null;

type OrderMenuProps = {
  orderId: string;
  reference: string;
  amount: number;
  back: OrderStatus | null;
  canCancel: boolean;
  upgrades: readonly Tier[];
  /** Moves the order; the card shows the new stage at once (OrderLive). */
  onMove: (to: OrderStatus) => void;
};

/** The order's secondary moves, each behind a dialog so none is one stray click. */
export function OrderMenu({
  orderId,
  reference,
  amount,
  back,
  canCancel,
  upgrades,
  onMove,
}: OrderMenuProps) {
  const [open, setOpen] = useState<Pending>(null);
  const close = () => setOpen(null);

  if (!back && !canCancel && upgrades.length === 0) return null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button aria-label={`More actions for ${reference}`} size="icon-sm" variant="ghost" />
          }
        >
          <MoreHorizontal />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          {back ? (
            <DropdownMenuItem onClick={() => setOpen('back')}>
              Move back to {STATUS_LABELS[back].admin}
            </DropdownMenuItem>
          ) : null}
          {upgrades.length > 0 ? (
            <DropdownMenuItem onClick={() => setOpen('upgrade')}>Upgrade tier</DropdownMenuItem>
          ) : null}
          {canCancel ? (
            <DropdownMenuItem className="text-wine" onClick={() => setOpen('cancel')}>
              Cancel order
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog onOpenChange={(next) => (next ? undefined : close())} open={open !== null}>
        <DialogContent>
          {open === 'back' && back ? (
            <>
              <DialogHeader>
                <DialogTitle>Move {reference} back?</DialogTitle>
                <DialogDescription>It returns to {STATUS_LABELS[back].admin}.</DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  onClick={() => {
                    close();
                    onMove(back);
                  }}
                  type="button"
                >
                  Move back to {STATUS_LABELS[back].admin}
                </Button>
              </DialogFooter>
            </>
          ) : null}

          {open === 'upgrade' ? (
            <>
              <DialogHeader>
                <DialogTitle>Upgrade {reference}</DialogTitle>
                <DialogDescription>
                  Set the new tier and the new total the client pays.
                </DialogDescription>
              </DialogHeader>
              <ActionForm
                action={applyUpgrade}
                className="grid gap-4"
                onSuccess={close}
                submitLabel="Upgrade"
              >
                <input name="orderId" type="hidden" value={orderId} />
                <NativeSelect aria-label="New tier" name="tier">
                  {upgrades.map((tier) => (
                    <option key={tier} value={tier}>
                      {TIER_LABELS[tier]}
                    </option>
                  ))}
                </NativeSelect>
                <Field
                  defaultValue={String(amount)}
                  label="New total (USD)"
                  name="amount"
                  type="number"
                />
              </ActionForm>
            </>
          ) : null}

          {open === 'cancel' ? (
            <>
              <DialogHeader>
                <DialogTitle>Cancel {reference}?</DialogTitle>
                <DialogDescription>A cancelled order cannot be moved again.</DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  onClick={() => {
                    close();
                    onMove(ORDER_STATUS.CANCELLED);
                  }}
                  type="button"
                  variant="destructive"
                >
                  Cancel order
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
