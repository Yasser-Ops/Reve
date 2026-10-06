import Link from 'next/link';
import { ActionForm } from '@/components/admin/ActionForm';
import { Eyebrow } from '@/components/admin/Eyebrow';
import { OrderMenu } from '@/components/admin/OrderMenu';
import { StageStepper } from '@/components/admin/StageStepper';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { TEMPLATES, VISIBILITY, getTemplateEntry } from '@/components/invitation/registry';
import { buttonVariants } from '@/components/ui/button';
import { NativeSelect } from '@/components/ui/native-select';
import type { ClientDetail } from '@/lib/admin/clients';
import { moveOrder, provisionInvitation } from '@/lib/admin/order-actions';
import { TIER_LABELS } from '@/lib/constants';
import {
  ORDER_STATUS,
  STATUS_LABELS,
  allowedMoves,
  hasReached,
  nextMove,
  previousMove,
} from '@/lib/orders/status';
import { upgradeTargets } from '@/lib/orders/upgrade';
import { adminRoutes } from '@/lib/routes';

type Order = ClientDetail['orders'][number];

const when = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' });

/** One order: where it stands, the one obvious next step, everything else in the menu. */
export function OrderCard({ order }: { order: Order }) {
  const forward = nextMove(order.tier, order.status);
  const invitation = order.invitations;
  const canProvision = !invitation && hasReached(order.tier, order.status, ORDER_STATUS.PAID);

  return (
    <article className="grid gap-5 rounded-2xl border bg-card p-5 sm:p-6">
      <header className="flex items-start justify-between gap-4">
        <div className="grid gap-1.5">
          <Eyebrow>Order {order.reference}</Eyebrow>
          <p className="flex flex-wrap items-center gap-3 font-heading text-[22px]">
            {TIER_LABELS[order.tier]} · ${order.amount}
            <StatusBadge status={order.status} />
          </p>
          {order.due_at ? (
            <p className="text-muted-foreground">Due {when.format(new Date(order.due_at))}</p>
          ) : null}
        </div>
        <OrderMenu
          amount={order.amount}
          back={previousMove(order.tier, order.status)}
          canCancel={allowedMoves(order.tier, order.status).includes(ORDER_STATUS.CANCELLED)}
          orderId={order.id}
          reference={order.reference}
          upgrades={upgradeTargets(order.tier)}
        />
      </header>

      <StageStepper status={order.status} tier={order.tier} />

      <div className="flex flex-wrap items-center gap-3">
        {forward ? (
          <ActionForm
            action={moveOrder}
            className="contents"
            submitLabel={`Move to ${STATUS_LABELS[forward].admin}`}
          >
            <input name="orderId" type="hidden" value={order.id} />
            <input name="to" type="hidden" value={forward} />
          </ActionForm>
        ) : order.status === ORDER_STATUS.REVIEW ? (
          <p className="text-muted-foreground">Publishing the invitation delivers this order.</p>
        ) : null}

        {canProvision ? (
          <ActionForm
            action={provisionInvitation}
            className="flex flex-wrap items-center gap-2"
            submitLabel="Create invitation"
            variant="outline"
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
      </div>

      {invitation ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-muted px-4 py-3">
          <div>
            <p className="font-medium">
              {getTemplateEntry(invitation.template_slug)?.name ?? invitation.template_slug} · /i/
              {invitation.slug}
            </p>
            <p className="text-muted-foreground capitalize">{invitation.status}</p>
          </div>
          <Link
            className={buttonVariants({ variant: 'outline' })}
            href={adminRoutes.invitation(invitation.id)}
          >
            Open editor
          </Link>
        </div>
      ) : null}
    </article>
  );
}
