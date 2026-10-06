import Link from 'next/link';
import { ActionForm } from '@/components/admin/ActionForm';
import { OrderLive } from '@/components/admin/OrderLive';
import { TEMPLATES, VISIBILITY, getTemplateEntry } from '@/components/invitation/registry';
import { buttonVariants } from '@/components/ui/button';
import { NativeSelect } from '@/components/ui/native-select';
import type { ClientDetail } from '@/lib/admin/clients';
import { provisionInvitation } from '@/lib/admin/order-actions';
import { STUDIO_TIME_ZONE } from '@/lib/constants';
import { ORDER_STATUS, hasReached } from '@/lib/orders/status';
import { upgradeTargets } from '@/lib/orders/upgrade';
import { adminRoutes } from '@/lib/routes';

type Order = ClientDetail['orders'][number];

/* Studio time, not the server's. */
const when = new Intl.DateTimeFormat('en-GB', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: STUDIO_TIME_ZONE,
});

/**
 * One order. OrderLive (client) owns what moves: badge, stepper, primary
 * move, menu. Provisioning and the invitation row stay server-rendered and
 * pass through as children.
 */
export function OrderCard({ order }: { order: Order }) {
  const invitation = order.invitations;
  const canProvision = !invitation && hasReached(order.tier, order.status, ORDER_STATUS.PAID);

  return (
    <OrderLive
      amount={order.amount}
      dueLabel={order.due_at ? when.format(new Date(order.due_at)) : null}
      orderId={order.id}
      reference={order.reference}
      status={order.status}
      tier={order.tier}
      upgrades={upgradeTargets(order.tier)}
    >
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
    </OrderLive>
  );
}
