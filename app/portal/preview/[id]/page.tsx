import { notFound } from 'next/navigation';
import { z } from 'zod';
import { DraftRender } from '@/components/invitation/DraftRender';
import { getTemplateEntry } from '@/components/invitation/registry';
import { REVIEW_BAR_SPACE, ReviewForm } from '@/components/portal/ReviewForm';
import { requireClient } from '@/lib/auth/guards';
import { contentFingerprint } from '@/lib/invitations/publish-guard';
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
    .select('id, template_slug, content, theme, entitlements, orders(status)')
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

  return (
    <>
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
          />
        </>
      ) : null}
    </>
  );
}
