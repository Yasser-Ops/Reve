'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { UNEXPECTED, type ActionResult } from '@/lib/admin/action-result';
import { isAdmin } from '@/lib/auth/admin-membership';
import { requireAdmin } from '@/lib/auth/guards';
import {
  PASSWORD_MESSAGES,
  PASSWORD_RULES,
  SIGN_IN_MESSAGES,
  type SignInResult,
} from '@/lib/auth/messages';
import { ROUTES } from '@/lib/routes';
import { verifyPassword } from '@/lib/supabase/password-check';
import { createClient } from '@/lib/supabase/server';

const signInSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

export async function signInAdmin(
  _previous: SignInResult | null,
  formData: FormData,
): Promise<SignInResult> {
  const parsed = signInSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });

  if (!parsed.success) {
    return { ok: false, message: SIGN_IN_MESSAGES.INVALID_INPUT };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);

  /* One message for every refusal Supabase gives (wrong password, unknown
     email, unconfirmed email), so the form reveals nothing about which. */
  if (error || !data.user) {
    return { ok: false, message: SIGN_IN_MESSAGES.BAD_CREDENTIALS };
  }

  if (!(await isAdmin(supabase, data.user.id))) {
    /* Local only. Clients share auth.users, and a client who types their
       portal password here must not be signed out on every other device. */
    await supabase.auth.signOut({ scope: 'local' });
    return { ok: false, message: SIGN_IN_MESSAGES.NOT_ADMIN };
  }

  redirect(ROUTES.ADMIN);
}

export async function signOut(): Promise<never> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect(ROUTES.ADMIN_LOGIN);
}

const changePasswordSchema = z
  .object({
    current: z.string().min(1, PASSWORD_MESSAGES.WRONG_CURRENT),
    next: z
      .string()
      .min(PASSWORD_RULES.MIN, PASSWORD_MESSAGES.TOO_SHORT)
      .max(PASSWORD_RULES.MAX, PASSWORD_MESSAGES.TOO_LONG),
    confirm: z.string(),
  })
  .refine((input) => input.confirm === input.next, PASSWORD_MESSAGES.MISMATCH)
  .refine((input) => input.next !== input.current, PASSWORD_MESSAGES.UNCHANGED);

/* Supabase's error codes for a refused new password. */
const PASSWORD_REFUSALS: Record<string, string> = {
  weak_password: PASSWORD_MESSAGES.WEAK,
  same_password: PASSWORD_MESSAGES.UNCHANGED,
};

/**
 * Changes the signed-in admin's password. The current password is checked
 * first, so an open session alone cannot change it; afterwards every OTHER
 * session is ended, so a leaked old password stops working everywhere.
 */
export async function changePassword(
  _previous: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const admin = await requireAdmin();
  const input = changePasswordSchema.safeParse({
    current: formData.get('current') ?? '',
    next: formData.get('next') ?? '',
    confirm: formData.get('confirm') ?? '',
  });
  if (!input.success) return { ok: false, message: input.error.issues[0].message };

  if (!(await verifyPassword(admin.email, input.data.current))) {
    return { ok: false, message: PASSWORD_MESSAGES.WRONG_CURRENT };
  }

  const supabase = await createClient();
  const { error: updateError } = await supabase.auth.updateUser({
    password: input.data.next,
  });
  if (updateError) {
    const code = updateError.code ?? '';
    return {
      ok: false,
      message: Object.hasOwn(PASSWORD_REFUSALS, code) ? PASSWORD_REFUSALS[code] : UNEXPECTED,
    };
  }

  const { error: signOutError } = await supabase.auth.signOut({ scope: 'others' });
  if (signOutError) return { ok: false, message: PASSWORD_MESSAGES.CHANGED_OTHERS_KEPT };

  return { ok: true };
}
