import { notFound } from 'next/navigation';
import { z } from 'zod';
import { DraftRender } from '@/components/invitation/DraftRender';
import { getTemplateEntry } from '@/components/invitation/registry';
import { requireClient } from '@/lib/auth/guards';
import { REVIEW_MESSAGES } from '@/lib/portal/messages';
import { createClient } from '@/lib/supabase/server';

export const metadata = { robots: { index: false, follow: false } };

/**
 * The client's draft, rendered as a guest will see it. Outside the (gated)
 * group on purpose: AppSurface would repaint the design, so this page checks
 * the client itself. RLS scopes the read to their own invitation.
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
    .select('template_slug, content, theme, entitlements')
    .eq('id', id.data)
    .maybeSingle();
  if (error) throw error;
  if (!invitation || !getTemplateEntry(invitation.template_slug)) notFound();

  return (
    <DraftRender
      content={invitation.content}
      entitlements={invitation.entitlements}
      incompleteMessage={REVIEW_MESSAGES.INCOMPLETE}
      templateSlug={invitation.template_slug}
      theme={invitation.theme}
    />
  );
}
