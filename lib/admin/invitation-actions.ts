'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { UNEXPECTED, type ActionResult } from '@/lib/admin/action-result';
import { requireAdmin } from '@/lib/auth/guards';
import { checkContent, toJson } from '@/lib/invitations/content';
import { canPublish } from '@/lib/invitations/publish-guard';
import { slugSchema } from '@/lib/invitations/slug';
import { ORDER_STATUS } from '@/lib/orders/status';
import { adminRoutes } from '@/lib/routes';
import { createClient } from '@/lib/supabase/server';

const UNIQUE_VIOLATION = '23505';

export async function saveContent(
  _previous: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  await requireAdmin();
  const id = z.uuid().safeParse(formData.get('invitationId'));
  const raw = z.string().max(200_000).safeParse(formData.get('content'));
  if (!id.success || !raw.success) return { ok: false, message: 'Nothing to save.' };

  const supabase = await createClient();
  const { data: invitation, error } = await supabase
    .from('invitations')
    .select('id, template_slug')
    .eq('id', id.data)
    .maybeSingle();
  if (error || !invitation) return { ok: false, message: UNEXPECTED };

  const check = checkContent(invitation.template_slug, raw.data);
  if (!check.ok) {
    return { ok: false, message: 'Not saved: fix these first.', issues: check.issues };
  }

  const { error: updateError } = await supabase
    .from('invitations')
    .update({ content: check.content })
    .eq('id', invitation.id);
  if (updateError) return { ok: false, message: UNEXPECTED };

  revalidatePath(adminRoutes.invitation(invitation.id));
  return { ok: true };
}

export async function updateSlug(
  _previous: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  await requireAdmin();
  const id = z.uuid().safeParse(formData.get('invitationId'));
  const slug = slugSchema.safeParse(formData.get('slug'));
  if (!id.success) return { ok: false, message: UNEXPECTED };
  if (!slug.success) {
    return { ok: false, message: 'Use 3 to 60 lowercase letters, digits and single hyphens.' };
  }

  const supabase = await createClient();
  const { data: invitation, error } = await supabase
    .from('invitations')
    .select('id, published_at')
    .eq('id', id.data)
    .maybeSingle();
  if (error || !invitation) return { ok: false, message: UNEXPECTED };

  /* Once published the link is in guests' WhatsApp threads. */
  if (invitation.published_at) {
    return {
      ok: false,
      message: 'This invitation has been published: its link is already with guests.',
    };
  }

  const { error: updateError } = await supabase
    .from('invitations')
    .update({ slug: slug.data })
    .eq('id', invitation.id);
  if (updateError) {
    return updateError.code === UNIQUE_VIOLATION
      ? { ok: false, message: 'Another invitation already uses that link.' }
      : { ok: false, message: UNEXPECTED };
  }

  revalidatePath(adminRoutes.invitation(invitation.id));
  return { ok: true };
}

export async function approveOnBehalf(
  _previous: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  await requireAdmin();
  const id = z.uuid().safeParse(formData.get('invitationId'));
  const note = z.string().trim().max(500).safeParse(formData.get('note') ?? '');
  if (!id.success || !note.success) return { ok: false, message: UNEXPECTED };

  const supabase = await createClient();
  const { data: invitation, error } = await supabase
    .from('invitations')
    .select('id, content')
    .eq('id', id.data)
    .maybeSingle();
  if (error || !invitation) return { ok: false, message: UNEXPECTED };

  /* The snapshot IS the approval: it records exactly what was agreed. */
  const { error: insertError } = await supabase.from('invitation_reviews').insert({
    invitation_id: invitation.id,
    decision: 'approved',
    content_snapshot: invitation.content,
    on_behalf: true,
    note: note.data,
  });
  if (insertError) return { ok: false, message: UNEXPECTED };

  revalidatePath(adminRoutes.invitation(invitation.id));
  return { ok: true };
}

export async function publishInvitation(
  _previous: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  await requireAdmin();
  const id = z.uuid().safeParse(formData.get('invitationId'));
  if (!id.success) return { ok: false, message: UNEXPECTED };

  const supabase = await createClient();
  const { data: invitation, error } = await supabase
    .from('invitations')
    .select(
      'id, content, published_at, orders(id, status, client_id), invitation_reviews(decision, content_snapshot, created_at)',
    )
    .eq('id', id.data)
    .order('created_at', { referencedTable: 'invitation_reviews', ascending: false })
    .limit(1, { referencedTable: 'invitation_reviews' })
    .maybeSingle();
  if (error || !invitation) return { ok: false, message: UNEXPECTED };

  /* REVIEW for a first publish; DELIVERED to put a freshly approved edit of
     a live invitation up in place of the old one. */
  const order = invitation.orders;
  const publishable = order?.status === ORDER_STATUS.REVIEW || order?.status === ORDER_STATUS.DELIVERED;
  if (!order || !publishable) {
    return { ok: false, message: 'Send the order for review before publishing.' };
  }

  const latest = invitation.invitation_reviews[0];
  const verdict = canPublish(
    invitation.content,
    latest ? { decision: latest.decision, contentSnapshot: latest.content_snapshot } : null,
  );
  if (!verdict.ok || !latest) {
    return { ok: false, message: verdict.ok ? UNEXPECTED : verdict.reason };
  }

  const now = new Date().toISOString();
  const { error: publishError } = await supabase
    .from('invitations')
    /* The APPROVED snapshot goes live, not the working content: an edit that
       lands after this read cannot slip onto the guest page unapproved. */
    .update({
      status: 'published',
      published_content: toJson(latest.content_snapshot),
      published_at: invitation.published_at ?? now,
    })
    .eq('id', invitation.id);
  if (publishError) return { ok: false, message: UNEXPECTED };

  /* Re-running after a failure here is safe: the content still matches its
     approval, so publishing again changes nothing and delivers the order. */
  const { error: deliverError } = await supabase
    .from('orders')
    .update({ status: ORDER_STATUS.DELIVERED, updated_at: now })
    .eq('id', order.id);
  if (deliverError) {
    return {
      ok: false,
      message: 'Published, but the order was not marked delivered. Publish again.',
    };
  }

  revalidatePath(adminRoutes.invitation(invitation.id));
  revalidatePath(adminRoutes.client(order.client_id));
  return { ok: true };
}
