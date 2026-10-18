import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { z } from 'zod';
import { ActionForm } from '@/components/admin/ActionForm';
import { Breadcrumbs, type Crumb } from '@/components/admin/Breadcrumbs';
import { ContentEditor } from '@/components/admin/ContentEditor';
import { CopyChecklist } from '@/components/admin/CopyChecklist';
import { Eyebrow } from '@/components/admin/Eyebrow';
import { Field } from '@/components/admin/fields';
import { LIVE_TABLE, LiveRefresh } from '@/components/LiveRefresh';
import { MediaSection } from '@/components/admin/MediaSection';
import { ReviewPanel } from '@/components/admin/ReviewPanel';
import { getTemplateEntry } from '@/components/invitation/registry';
import { formModel, isRecord, type MediaOptions } from '@/lib/admin/content-form';
import { updateSlug } from '@/lib/admin/invitation-actions';
import { getInvitationForEditor } from '@/lib/admin/invitations';
import { listMedia } from '@/lib/admin/media';
import { requireAdmin } from '@/lib/auth/guards';
import { ROUTES, adminRoutes } from '@/lib/routes';
import { checklistFor, checklistMessage } from '@/lib/schemas/content/checklist';

export const metadata: Metadata = { title: 'Invitation' };

export default async function InvitationEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const id = z.uuid().safeParse((await params).id);
  if (!id.success) notFound();

  /* In parallel: listing an invitation that turns out not to exist costs
     nothing but returns nothing. */
  const [invitation, files] = await Promise.all([
    getInvitationForEditor(id.data),
    listMedia(id.data),
  ]);
  if (!invitation) notFound();

  const design = getTemplateEntry(invitation.template_slug);
  if (!design) {
    throw new Error(
      `Invitation ${invitation.id} names unknown design ${invitation.template_slug}`,
    );
  }

  const order = invitation.orders;
  const checklist = checklistFor(design.schema);
  const fields = formModel(design.schema);

  /* Listed once: the media section shows them, the form's media fields offer them. */
  const media: MediaOptions = { photos: [], hero: [], envelope: [] };
  for (const file of files) media[file.kind].push(file.url);

  const crumbs: Crumb[] = [{ label: 'Clients', href: ROUTES.ADMIN }];
  if (order) {
    crumbs.push(
      { label: order.clients?.full_name ?? 'Client', href: adminRoutes.client(order.client_id) },
      { label: order.reference, href: adminRoutes.client(order.client_id) },
    );
  }
  crumbs.push({ label: 'Invitation' });

  return (
    <main className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-6">
      <LiveRefresh tables={[LIVE_TABLE.REVIEWS, LIVE_TABLE.ORDERS]} />
      <Breadcrumbs items={crumbs} />

      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Eyebrow>Invitation · {design.name}</Eyebrow>
          <h1 className="mt-2 font-heading text-[34px] leading-tight">/i/{invitation.slug}</h1>
        </div>
        <CopyChecklist message={checklistMessage(checklist)} />
      </header>

      {invitation.published_at ? null : (
        <ActionForm
          action={updateSlug}
          className="flex flex-wrap items-end gap-2"
          submitLabel="Change link"
          successMessage="Link changed."
          variant="outline"
        >
          <input name="invitationId" type="hidden" value={invitation.id} />
          <Field defaultValue={invitation.slug} label="Link (/i/…)" name="slug" />
        </ActionForm>
      )}

      <ContentEditor
        fields={fields}
        initial={isRecord(invitation.content) ? invitation.content : {}}
        invitationId={invitation.id}
        media={media}
        previewUrl={adminRoutes.preview(invitation.id)}
      />

      <MediaSection files={files} invitationId={invitation.id} />

      <ReviewPanel invitation={invitation} />
    </main>
  );
}
