'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { UNEXPECTED, type ActionResult } from '@/lib/admin/action-result';
import { requireClient } from '@/lib/auth/guards';
import { contentFingerprint } from '@/lib/invitations/publish-guard';
import { REVIEW_MESSAGES, REVIEW_RULES } from '@/lib/portal/messages';
import { ROUTES, adminRoutes } from '@/lib/routes';
import { createClient } from '@/lib/supabase/server';

/* Postgres insufficient_privilege: how a refused RLS check arrives. */
const RLS_REFUSED = '42501';

const reviewSchema = z
  .object({
    invitationId: z.uuid(),
    fingerprint: z.string().regex(/^[0-9a-f]{64}$/),
    decision: z.enum(['approved', 'changes_requested']),
    note: z.string().trim().max(REVIEW_RULES.NOTE_MAX, REVIEW_MESSAGES.NOTE_TOO_LONG),
  })
  .refine((review) => review.decision === 'approved' || review.note.length > 0, {
    path: ['note'],
    message: REVIEW_MESSAGES.NOTE_REQUIRED,
  });

/**
 * The client approves the draft or asks for changes. Runs as the user: the
 * insert policy is what proves the invitation is theirs and that the
 * snapshot still equals the draft, so no other check is repeated here.
 */
export async function submitReview(
  _previous: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  await requireClient();
  const review = reviewSchema.safeParse({
    invitationId: formData.get('invitationId'),
    fingerprint: formData.get('fingerprint'),
    decision: formData.get('decision'),
    note: formData.get('note') ?? '',
  });
  if (!review.success) {
    const noteIssue = review.error.issues.find((issue) => issue.path[0] === 'note');
    return { ok: false, message: noteIssue?.message ?? UNEXPECTED };
  }

  const supabase = await createClient();
  const { data: invitation, error } = await supabase
    .from('invitations')
    .select('id, content')
    .eq('id', review.data.invitationId)
    .maybeSingle();
  if (error || !invitation) return { ok: false, message: UNEXPECTED };

  /* The client approves what they were shown. Content edited since the page
     rendered must not be approved unseen, and the policy alone cannot tell,
     because the snapshot below is read fresh. */
  if (contentFingerprint(invitation.content) !== review.data.fingerprint) {
    return { ok: false, message: REVIEW_MESSAGES.DRAFT_CHANGED };
  }

  /* No on_behalf, no created_by: the column defaults and the policy cover both. */
  const { error: insertError } = await supabase.from('invitation_reviews').insert({
    invitation_id: invitation.id,
    decision: review.data.decision,
    note: review.data.note,
    content_snapshot: invitation.content,
  });
  if (insertError) {
    return {
      ok: false,
      message: insertError.code === RLS_REFUSED ? REVIEW_MESSAGES.DRAFT_CHANGED : UNEXPECTED,
    };
  }

  revalidatePath(ROUTES.PORTAL);
  revalidatePath(adminRoutes.invitation(invitation.id));
  return { ok: true };
}
