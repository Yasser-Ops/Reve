'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { isAdmin } from '@/lib/auth/admin-membership';
import { SIGN_IN_MESSAGES, type SignInResult } from '@/lib/auth/messages';
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
    await supabase.auth.signOut();
    return { ok: false, message: SIGN_IN_MESSAGES.NOT_ADMIN };
  }

  redirect(ROUTES.ADMIN);
}

export async function signOut(): Promise<never> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect(ROUTES.ADMIN_LOGIN);
}
