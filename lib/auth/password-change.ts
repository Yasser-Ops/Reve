import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { UNEXPECTED, type ActionResult } from '@/lib/admin/action-result';
import { PASSWORD_MESSAGES } from '@/lib/auth/messages';
import { passwordSchema } from '@/lib/auth/password';
import type { Database } from '@/lib/supabase/database.types';
import { verifyPassword } from '@/lib/supabase/password-check';
import { createClient } from '@/lib/supabase/server';

/* Supabase's error codes for a refused new password. */
const PASSWORD_REFUSALS: Record<string, string> = {
  weak_password: PASSWORD_MESSAGES.WEAK,
  same_password: PASSWORD_MESSAGES.UNCHANGED,
};

/**
 * Sets the signed-in user's password. Returns null when it changed, or the
 * failure for the form. Shared by the change-password and reset flows.
 */
export async function updatePasswordOrRefuse(
  supabase: SupabaseClient<Database>,
  password: string,
): Promise<ActionResult | null> {
  const { error } = await supabase.auth.updateUser({ password });
  if (!error) return null;

  const code = error.code ?? '';
  return {
    ok: false,
    message: Object.hasOwn(PASSWORD_REFUSALS, code) ? PASSWORD_REFUSALS[code] : UNEXPECTED,
  };
}

/**
 * Changes the signed-in identity's password. The current password is checked
 * first, so an open session alone cannot change it; afterwards every OTHER
 * session is ended, so a leaked old password stops working everywhere.
 * Callers authorize first (admin guard or portal claims) and pass who they got.
 * Not in actions.ts: a 'use server' module may export only async functions,
 * and this must not become a callable endpoint without a guard in front.
 */
export async function changePasswordAs(
  identity: { email: string },
  formData: FormData,
): Promise<ActionResult> {
  const input = z
    .object({
      current: z.string().min(1, PASSWORD_MESSAGES.WRONG_CURRENT),
      next: passwordSchema(identity.email),
      confirm: z.string(),
    })
    .refine((value) => value.confirm === value.next, PASSWORD_MESSAGES.MISMATCH)
    .refine((value) => value.next !== value.current, PASSWORD_MESSAGES.UNCHANGED)
    .safeParse({
      current: formData.get('current') ?? '',
      next: formData.get('next') ?? '',
      confirm: formData.get('confirm') ?? '',
    });
  if (!input.success) return { ok: false, message: input.error.issues[0].message };

  if (!(await verifyPassword(identity.email, input.data.current))) {
    return { ok: false, message: PASSWORD_MESSAGES.WRONG_CURRENT };
  }

  const supabase = await createClient();
  const refusal = await updatePasswordOrRefuse(supabase, input.data.next);
  if (refusal) return refusal;

  const { error: signOutError } = await supabase.auth.signOut({ scope: 'others' });
  if (signOutError) return { ok: false, message: PASSWORD_MESSAGES.CHANGED_OTHERS_KEPT };

  return { ok: true };
}
