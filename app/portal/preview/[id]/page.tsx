import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { userAgent } from 'next/server';
import { z } from 'zod';
import { LIVE_TABLE, LiveRefresh } from '@/components/LiveRefresh';
import { DraftRender } from '@/components/invitation/DraftRender';
import { getTemplateEntry } from '@/components/invitation/registry';
import { PreviewViews } from '@/components/portal/PreviewViews';
import { REVIEW_BAR_SPACE, ReviewForm } from '@/components/portal/ReviewForm';
import { requireClient } from '@/lib/auth/guards';
import { contentFingerprint, sameContent } from '@/lib/invitations/publish-guard';
import { ORDER_STATUS } from '@/lib/orders/status';
import { REVIEW_MESSAGES } from '@/lib/portal/messages';
import { parsePreviewView } from '@/lib/portal/preview-view';
import { fillPlaceholders } from '@/lib/schemas/content/placeholders';
import { VIEW_PARAM } from '@/lib/routes';
import { createClient } from '@/lib/supabase/server';

export const metadata = { robots: { index: false, follow: false } };

/**
 * The client's draft, rendered as a guest will see it. Outside the (gated)
 * group on purpose: AppSurface would repaint the design, so this page checks
 * the client itself. RLS scopes the read to their own invitation and order.
 *
 * The approval lives here, not on the dashboard, so the fingerprint it carries
 * is of the exact content this page rendered: a client can only approve what
 * they were shown.
 *
 * Open from the moment the invitation exists, so the client watches it take
 * shape: every save in the editor re-renders this page, empty core fields
 * drawn as placeholders. Approval waits for review and a complete draft.
 *
 * A renderable draft can be framed in the phone or full screen (`?view=`);
 * the review bar sits over either, unchanged.
 */
export default async function PortalPreviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
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
  if (
    !invitation ||
    !design ||
    !invitation.orders ||
    invitation.orders.status === ORDER_STATUS.CANCELLED
  ) {
    notFound();
  }

  /* Placeholders make a draft renderable; only real content makes it
     approvable. A draft nothing can stand in for shows a message, not a phone. */
  const complete = design.schema.safeParse(invitation.content).success;
  const renderable = fillPlaceholders(design.schema, invitation.content) !== null;
  const reviewing = invitation.orders.status === ORDER_STATUS.REVIEW && complete;
  const requested = parsePreviewView((await searchParams)[VIEW_PARAM]);
  /* Only a first-paint guess; the client corrects it from the real viewport. */
  const wideGuess = userAgent({ headers: await headers() }).device.type !== 'mobile';

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

  const draft = (
    <DraftRender
      content={invitation.content}
      entitlements={invitation.entitlements}
      incompleteMessage={REVIEW_MESSAGES.INCOMPLETE}
      templateSlug={invitation.template_slug}
      theme={invitation.theme}
    />
  );

  /* LiveRefresh re-renders this page in place when the operator saves, the
     order moves or a decision lands, so every edit shows without a reload. The review bar keeps
     its state across the refresh, an unsent note included. */
  return (
    <>
      <LiveRefresh tables={[LIVE_TABLE.INVITATIONS, LIVE_TABLE.ORDERS, LIVE_TABLE.REVIEWS]} />
      {renderable ? (
        <PreviewViews
          requested={requested}
          templateSlug={invitation.template_slug}
          wideGuess={wideGuess}
        >
          {draft}
        </PreviewViews>
      ) : (
        draft
      )}
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
