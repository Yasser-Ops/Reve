import Link from 'next/link';
import type { ReactNode } from 'react';
import { Eyebrow } from '@/components/admin/Eyebrow';
import { getTemplateEntry } from '@/components/invitation/registry';
import { LiveLink } from '@/components/portal/LiveLink';
import { LockedCard } from '@/components/portal/LockedCard';
import { buttonVariants } from '@/components/ui/button';
import { TIERS } from '@/lib/constants';
import { whatsappLink } from '@/lib/contact';
import { ORDER_STATUS, STATUS_LABELS, hasReached } from '@/lib/orders/status';
import type { PortalOrder } from '@/lib/portal/orders';
import { portalRoutes, publicRoutes } from '@/lib/routes';
import { checklistProgress } from '@/lib/schemas/content/checklist';
import { SITE_URL } from '@/lib/site';

const CHECKLIST_TITLE = 'What we need from you';

type OrderPanelProps = {
  order: PortalOrder;
  /** The approval form; shown only while the order waits on the client. */
  review?: ReactNode;
};

/** One order, told by its stage. Server-rendered: only the live link is interactive. */
export function OrderPanel({ order, review }: OrderPanelProps) {
  const { invitation, reference, status, tier } = order;

  /* A design the registry no longer knows has no checklist to show. */
  const schema = invitation ? getTemplateEntry(invitation.templateSlug)?.schema : undefined;
  const checklist =
    invitation && schema && !hasReached(tier, status, ORDER_STATUS.REVIEW)
      ? checklistProgress(schema, invitation.content)
      : null;

  return (
    <article className="grid gap-5 rounded-2xl border bg-card p-5 sm:p-6">
      <header className="grid gap-1.5">
        <Eyebrow>Order {reference}</Eyebrow>
        <h2 className="font-heading text-[22px]">{STATUS_LABELS[status].client}</h2>
      </header>

      {status === ORDER_STATUS.PENDING_PAYMENT ? (
        <div className="grid gap-3">
          <p>We will start as soon as your payment reaches us.</p>
          <a
            className={buttonVariants({ className: 'justify-self-start' })}
            href={whatsappLink(`Hi, I would like to pay for order ${reference}.`)}
            rel="noreferrer"
            target="_blank"
          >
            Pay on WhatsApp
          </a>
        </div>
      ) : null}

      {status === ORDER_STATUS.REVIEW && invitation ? (
        <div className="grid gap-4">
          <Link
            className={buttonVariants({ className: 'justify-self-start' })}
            href={portalRoutes.preview(invitation.id)}
          >
            See your invitation
          </Link>
          {review}
        </div>
      ) : null}

      {status === ORDER_STATUS.DELIVERED && invitation ? (
        <LiveLink url={`${SITE_URL}${publicRoutes.invitation(invitation.slug)}`} />
      ) : null}

      {status === ORDER_STATUS.PAID ||
      status === ORDER_STATUS.BRIEF ||
      status === ORDER_STATUS.CONCEPT ||
      status === ORDER_STATUS.IN_DESIGN ? (
        <p className="text-muted-foreground">We are working on it.</p>
      ) : null}

      {checklist ? (
        <section className="grid gap-2">
          <h3 className="font-heading text-lg">{CHECKLIST_TITLE}</h3>
          <ul aria-label={CHECKLIST_TITLE} className="grid gap-1.5">
            {checklist.map((item) => (
              <li className="flex items-start gap-2" data-done={item.done} key={item.key}>
                <span aria-hidden className="mt-0.5 w-4 text-wine">
                  {item.done ? '✓' : '○'}
                </span>
                <span className={item.done ? 'text-muted-foreground line-through' : undefined}>
                  {item.ask}
                  {item.required ? '' : ' (optional)'}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {tier === TIERS.BASIC ? (
        <LockedCard
          actionHref={whatsappLink(`Hi, I would like to upgrade order ${reference} to Managed.`)}
          actionLabel="Upgrade"
          title="Guest list"
        >
          Manage your guests and their replies with the Managed plan.
        </LockedCard>
      ) : (
        <section className="grid gap-2 rounded-xl bg-muted/40 p-4">
          <h3 className="font-heading text-lg">Guest list</h3>
          <p className="text-muted-foreground">Your guest list opens here soon.</p>
        </section>
      )}
    </article>
  );
}
