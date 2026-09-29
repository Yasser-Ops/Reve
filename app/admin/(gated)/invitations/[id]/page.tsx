import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { z } from 'zod';
import { ActionForm } from '@/components/admin/ActionForm';
import { ContentEditor } from '@/components/admin/ContentEditor';
import { CopyChecklist } from '@/components/admin/CopyChecklist';
import { Field } from '@/components/admin/fields';
import { getTemplateEntry } from '@/components/invitation/registry';
import { updateSlug } from '@/lib/admin/invitation-actions';
import { getInvitationForEditor } from '@/lib/admin/invitations';
import { requireAdmin } from '@/lib/auth/guards';
import { adminRoutes } from '@/lib/routes';
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

  const invitation = await getInvitationForEditor(id.data);
  if (!invitation) notFound();

  const design = getTemplateEntry(invitation.template_slug);
  if (!design) {
    throw new Error(
      `Invitation ${invitation.id} names unknown design ${invitation.template_slug}`,
    );
  }

  const checklist = checklistFor(design.schema);
  const order = invitation.orders;

  return (
    <main className="mx-auto grid max-w-6xl gap-8 px-6 py-10">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-medium">
            {design.name} · /i/{invitation.slug}
          </h1>
          {order ? (
            <Link
              className="text-muted-foreground underline"
              href={adminRoutes.client(order.client_id)}
            >
              {order.clients?.full_name} · {order.reference}
            </Link>
          ) : null}
        </div>
        <CopyChecklist message={checklistMessage(checklist)} />
      </header>

      <section className="grid gap-2">
        <h2 className="font-medium">Fields this design draws</h2>
        <ul className="grid gap-1 text-muted-foreground">
          {checklist.map((item) => (
            <li key={item.key}>
              <code className="text-foreground">{item.key}</code>
              {item.required ? '' : ' (optional)'}: {item.ask}
            </li>
          ))}
        </ul>
      </section>

      {invitation.published_at ? null : (
        <ActionForm
          action={updateSlug}
          className="flex items-end gap-2"
          submitLabel="Change link"
          successMessage="Link changed."
        >
          <input name="invitationId" type="hidden" value={invitation.id} />
          <Field defaultValue={invitation.slug} label="Link (/i/…)" name="slug" />
        </ActionForm>
      )}

      <ContentEditor
        initial={JSON.stringify(invitation.content, null, 2)}
        invitationId={invitation.id}
        previewUrl={adminRoutes.preview(invitation.id)}
      />
    </main>
  );
}
