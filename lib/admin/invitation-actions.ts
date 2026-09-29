'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { UNEXPECTED, type ActionResult } from '@/lib/admin/action-result';
import { requireAdmin } from '@/lib/auth/guards';
import { checkContent } from '@/lib/invitations/content';
import { slugSchema } from '@/lib/invitations/slug';
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
