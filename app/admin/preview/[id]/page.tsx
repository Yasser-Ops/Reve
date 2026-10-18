import { notFound } from 'next/navigation';
import { z } from 'zod';
import { DraftRender } from '@/components/invitation/DraftRender';
import { getTemplateEntry } from '@/components/invitation/registry';
import { getInvitationForEditor } from '@/lib/admin/invitations';
import { requireAdmin } from '@/lib/auth/guards';

export const metadata = { robots: { index: false, follow: false } };

const INCOMPLETE_MESSAGE =
  'The content is not complete for this design yet. Save it on the left to see it here.';

/**
 * The draft, rendered exactly as a guest will see it, and deliberately
 * OUTSIDE AppSurface: shadcn's base styles would repaint the design.
 */
export default async function DraftPreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const id = z.uuid().safeParse((await params).id);
  if (!id.success) notFound();

  const invitation = await getInvitationForEditor(id.data);
  if (!invitation || !getTemplateEntry(invitation.template_slug)) notFound();

  return (
    <DraftRender
      content={invitation.content}
      entitlements={invitation.entitlements}
      incompleteMessage={INCOMPLETE_MESSAGE}
      templateSlug={invitation.template_slug}
      theme={invitation.theme}
    />
  );
}
