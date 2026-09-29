'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { isAdmin } from '@/lib/auth/admin-membership';
import { ROUTES } from '@/lib/routes';
import { createClient } from '@/lib/supabase/server';

export const SIGN_IN_MESSAGES = {
  INVALID_INPUT: 'Enter your email address and password.',
  BAD_CREDENTIALS: 'That email and password do not match an account.',
  NOT_ADMIN: 'This account does not have admin access.',
} as const;

/** Only failure comes back: success redirects and never returns. */
export type SignInResult = { ok: false; message: string };

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
