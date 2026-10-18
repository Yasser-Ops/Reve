import { notFound } from 'next/navigation';
import { z } from 'zod';
import { LIVE_TABLE, LiveRefresh } from '@/components/LiveRefresh';
import { DraftRender } from '@/components/invitation/DraftRender';
import { getTemplateEntry } from '@/components/invitation/registry';
import { REVIEW_BAR_SPACE, ReviewForm } from '@/components/portal/ReviewForm';
import { requireClient } from '@/lib/auth/guards';
import { contentFingerprint, sameContent } from '@/lib/invitations/publish-guard';
import { ORDER_STATUS, type OrderStatus } from '@/lib/orders/status';
import { REVIEW_MESSAGES } from '@/lib/portal/messages';
import { createClient } from '@/lib/supabase/server';

export const metadata = { robots: { index: false, follow: false } };

/* Before review the draft is still being set; the client sees it here only
   once it is theirs to approve, or live. */
const VIEWABLE: ReadonlySet<OrderStatus> = new Set([ORDER_STATUS.REVIEW, ORDER_STATUS.DELIVERED]);

/**
 * The client's draft, rendered as a guest will see it. Outside the (gated)
 * group on purpose: AppSurface would repaint the design, so this page checks
 * the client itself. RLS scopes the read to their own invitation and order.
 *
 * The approval lives here, not on the dashboard, so the fingerprint it carries
 * is of the exact content this page rendered: a client can only approve what
 * they were shown.
 */
export default async function PortalPreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireClient();
  const id = z.uuid().safeParse((await params).id);
  if (!id.success) notFound();

  const supabase = await createClient();
  const { data: invitation, error } = await supabase
    .from('invitations')
    .select(
      'id, template_slug, content, theme, entitlements, orders(status), invitation_reviews(decision, note, created_at, content_snapshot)',
    )
    .eq('id', id.data)
    .maybeSingle();
  if (error) throw error;
  const design = invitation ? getTemplateEntry(invitation.template_slug) : undefined;
  if (!invitation || !design || !invitation.orders || !VIEWABLE.has(invitation.orders.status)) {
    notFound();
  }

  /* An incomplete draft shows a message, not the design: nothing to approve. */
  const reviewing =
    invitation.orders.status === ORDER_STATUS.REVIEW &&
    design.schema.safeParse(invitation.content).success;

  const newest = invitation.invitation_reviews
    .toSorted((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))
    .at(0);
  const latest = newest
    ? {
        decision: newest.decision,
        createdAt: newest.created_at,
        note: newest.note,
        current: sameContent(newest.content_snapshot, invitation.content),
      }
    : null;

  /* LiveRefresh re-renders this page in place when the order moves or a
     decision lands, so a publish shows without a reload. The review bar keeps
     its state across the refresh, an unsent note included. */
  return (
    <>
      <LiveRefresh tables={[LIVE_TABLE.ORDERS, LIVE_TABLE.REVIEWS]} />
      <DraftRender
        content={invitation.content}
        entitlements={invitation.entitlements}
        incompleteMessage={REVIEW_MESSAGES.INCOMPLETE}
        templateSlug={invitation.template_slug}
        theme={invitation.theme}
      />
      {reviewing ? (
        <>
          <div aria-hidden style={{ height: REVIEW_BAR_SPACE }} />
          <ReviewForm
            fingerprint={contentFingerprint(invitation.content)}
            invitationId={invitation.id}
            latest={latest}
          />
        </>
      ) : null}
    </>
  );
}
