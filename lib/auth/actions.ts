'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import type { ActionResult } from '@/lib/admin/action-result';
import { isAdmin } from '@/lib/auth/admin-membership';
import { requireAdmin } from '@/lib/auth/guards';
import { SIGN_IN_MESSAGES, type SignInResult } from '@/lib/auth/messages';
import { changePasswordAs } from '@/lib/auth/password-change';
import { ROUTES } from '@/lib/routes';
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

/** Changes the signed-in admin's password; the shared body is in password-change.ts. */
export async function changePassword(
  _previous: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const admin = await requireAdmin();
  return changePasswordAs(admin, formData);
}
