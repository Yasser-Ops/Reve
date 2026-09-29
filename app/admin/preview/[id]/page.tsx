import { notFound } from 'next/navigation';
import { z } from 'zod';
import { TemplateRenderer } from '@/components/invitation/TemplateRenderer';
import { getTemplateEntry } from '@/components/invitation/registry';
import { getInvitationForEditor } from '@/lib/admin/invitations';
import { requireAdmin } from '@/lib/auth/guards';
import { entitlementsSchema, themeSchema } from '@/lib/schemas/invitation';

export const metadata = { robots: { index: false, follow: false } };

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
  const design = invitation ? getTemplateEntry(invitation.template_slug) : undefined;
  if (!invitation || !design) notFound();

  const content = design.schema.safeParse(invitation.content);
  if (!content.success) {
    return (
      <main style={{ fontFamily: 'system-ui', padding: 24, fontSize: 14 }}>
        <p>
          The content is not complete for this design yet. Save it on the left to see it
          here.
        </p>
      </main>
    );
  }

  return (
    <TemplateRenderer
      content={content.data}
      entitlements={entitlementsSchema.parse(invitation.entitlements)}
      templateSlug={invitation.template_slug}
      theme={themeSchema.parse(invitation.theme)}
    />
  );
}
