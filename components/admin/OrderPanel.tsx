import { ActionForm } from '@/components/admin/ActionForm';
import { Field } from '@/components/admin/fields';
import { TEMPLATES, VISIBILITY } from '@/components/invitation/registry';
import { NativeSelect } from '@/components/ui/native-select';
import type { ClientDetail } from '@/lib/admin/clients';
import { applyUpgrade, moveOrder, provisionInvitation } from '@/lib/admin/order-actions';
import { ORDER_STATUS, STATUS_LABELS, allowedMoves, hasReached } from '@/lib/orders/status';
import { upgradeTargets } from '@/lib/orders/upgrade';

type Order = ClientDetail['orders'][number];

/** An order's stage buttons and, where one exists, its upgrade. */
export function OrderPanel({ order }: { order: Order }) {
  const moves = allowedMoves(order.tier, order.status);
  const targets = upgradeTargets(order.tier);
  const canProvision =
    !order.invitations && hasReached(order.tier, order.status, ORDER_STATUS.PAID);

  return (
    <div className="grid gap-4">
      {canProvision ? (
        <ActionForm
          action={provisionInvitation}
          className="flex flex-wrap items-end gap-2"
          submitLabel="Create invitation"
        >
          <input name="orderId" type="hidden" value={order.id} />
          <NativeSelect aria-label="Design" name="templateSlug">
            {TEMPLATES.map((design) => (
              <option key={design.slug} value={design.slug}>
                {design.name}
                {design.visibility === VISIBILITY.LISTED ? '' : ` (${design.visibility})`}
              </option>
            ))}
          </NativeSelect>
        </ActionForm>
      ) : null}

      {moves.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {moves.map((to) => (
            <ActionForm
              action={moveOrder}
              className="contents"
              key={to}
              submitLabel={STATUS_LABELS[to].admin}
              variant="outline"
            >
              <input name="orderId" type="hidden" value={order.id} />
              <input name="to" type="hidden" value={to} />
            </ActionForm>
          ))}
        </div>
      ) : null}

      {targets.length > 0 ? (
        <ActionForm
          action={applyUpgrade}
          className="flex flex-wrap items-end gap-2"
          submitLabel="Upgrade"
        >
          <input name="orderId" type="hidden" value={order.id} />
          <NativeSelect name="tier">
            {targets.map((tier) => (
              <option key={tier} value={tier}>
                {tier}
              </option>
            ))}
          </NativeSelect>
          <Field
            defaultValue={String(order.amount)}
            label="New total (USD)"
            name="amount"
            type="number"
          />
        </ActionForm>
      ) : null}
    </div>
  );
}
