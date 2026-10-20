'use server';

import { INVITATION_STATUS } from '@/lib/constants';
import { entitlementsSchema } from '@/lib/schemas/invitation';
import { RSVP_MESSAGES, rsvpSubmissionSchema, type RsvpResult } from '@/lib/schemas/rsvp';
import { createAdminClient } from '@/lib/supabase/admin';

const LOG_TAG = '[rsvp]';

/** Code and message only: never the guest's name, notes or message. */
function logFailure(step: string, failure: unknown) {
  const { code, message } = (failure ?? {}) as { code?: unknown; message?: unknown };
  console.error(LOG_TAG, step, { code, message });
}

/**
 * Stores an anonymous guest's reply. Anon has no grants on `rsvps`, so the
 * service role writes it, after checking here that the invitation is live and
 * has replies switched on. The guest never sees an internal error.
 */
export async function submitRsvp(
  _previous: RsvpResult | null,
  formData: FormData,
): Promise<RsvpResult> {
  const input = rsvpSubmissionSchema.safeParse({
    slug: formData.get('slug'),
    name: formData.get('name'),
    attending: formData.get('attending'),
    partySize: formData.get('partySize'),
    dietaryNotes: formData.get('dietaryNotes'),
    message: formData.get('message'),
    company: formData.get('company'),
  });
  if (!input.success) return { ok: false, message: RSVP_MESSAGES.INVALID };
  const reply = input.data;

  /* A bot fills the hidden field: look like a success, store nothing. */
  if (reply.company) return { ok: true, attending: reply.attending };

  try {
    const supabase = createAdminClient();
    const { data: invitation, error } = await supabase
      .from('invitations')
      .select('id, status, entitlements')
      .eq('slug', reply.slug)
      .maybeSingle();
    if (error) {
      logFailure('lookup', error);
      return { ok: false, message: RSVP_MESSAGES.FAILED };
    }

    const open =
      invitation?.status === INVITATION_STATUS.PUBLISHED &&
      entitlementsSchema.safeParse(invitation.entitlements).data?.rsvp === true;
    if (!invitation || !open) return { ok: false, message: RSVP_MESSAGES.CLOSED };

    const { error: insertError } = await supabase.from('rsvps').insert({
      invitation_id: invitation.id,
      name: reply.name,
      attending: reply.attending,
      party_size: reply.partySize,
      dietary_notes: reply.dietaryNotes,
      message: reply.message,
    });
    if (insertError) {
      logFailure('insert', insertError);
      return { ok: false, message: RSVP_MESSAGES.FAILED };
    }

    return { ok: true, attending: reply.attending };
  } catch (caught) {
    logFailure('exception', caught);
    return { ok: false, message: RSVP_MESSAGES.FAILED };
  }
}
