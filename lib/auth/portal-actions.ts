'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { UNEXPECTED, type ActionResult } from '@/lib/admin/action-result';
import { getClientForUser } from '@/lib/auth/client-membership';
import {
  PASSWORD_MESSAGES,
  PORTAL_MESSAGES,
  SIGN_IN_MESSAGES,
  type SignInResult,
} from '@/lib/auth/messages';
import { passwordSchema } from '@/lib/auth/password';
import { confirmUrl, NOTICE_PARAM, PORTAL_NOTICE, ROUTES } from '@/lib/routes';
import { createMailClient } from '@/lib/supabase/mailer';
import { createClient } from '@/lib/supabase/server';

const signInSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

export async function signInClient(
  _previous: SignInResult | null,
  formData: FormData,
): Promise<SignInResult> {
  const parsed = signInSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });
  if (!parsed.success) return { ok: false, message: SIGN_IN_MESSAGES.INVALID_INPUT };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);

  /* One message for every refusal, so the form reveals nothing about which. */
  if (error || !data.user) {
    return { ok: false, message: SIGN_IN_MESSAGES.BAD_CREDENTIALS };
  }

  if (!(await getClientForUser(supabase, data.user.id))) {
    /* Local only: an admin who typed their password here keeps their other
       sessions. */
    await supabase.auth.signOut({ scope: 'local' });
    return { ok: false, message: PORTAL_MESSAGES.NOT_CLIENT };
  }

  redirect(ROUTES.PORTAL);
}

const emailSchema = z.object({ email: z.email() });

/**
 * Always answers ok for a well-formed email, so the form cannot be used to
 * learn which addresses have accounts. Sent through the implicit-flow mail
 * client: a PKCE verifier would be stored in the browser that asked, and the
 * email is often opened on a phone that does not have it.
 */
export async function requestReset(
  _previous: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = emailSchema.safeParse({ email: formData.get('email') });
  if (!parsed.success) return { ok: false, message: SIGN_IN_MESSAGES.INVALID_INPUT };

  await createMailClient().auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: confirmUrl(ROUTES.PORTAL_RESET),
  });

  return { ok: true };
}

/* Supabase's error codes for a refused new password. */
const PASSWORD_REFUSALS: Record<string, string> = {
  weak_password: PASSWORD_MESSAGES.WEAK,
  same_password: PASSWORD_MESSAGES.UNCHANGED,
};

/**
 * Sets the password for the person the recovery link signed in. No current
 * password is asked for: holding the emailed link is the proof.
 */
export async function setNewPassword(
  _previous: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const supabase = await createClient();
  const { data, error: claimsError } = await supabase.auth.getClaims();
  const claims = claimsError ? null : data?.claims;
  if (!claims) {
    redirect(`${ROUTES.PORTAL_LOGIN}?${NOTICE_PARAM}=${PORTAL_NOTICE.LINK_EXPIRED}`);
  }

  const input = z
    .object({ password: passwordSchema(claims.email ?? ''), confirm: z.string() })
    .refine((value) => value.confirm === value.password, PASSWORD_MESSAGES.MISMATCH)
    .safeParse({
      password: formData.get('password') ?? '',
      confirm: formData.get('confirm') ?? '',
    });
  if (!input.success) return { ok: false, message: input.error.issues[0].message };

  const { error } = await supabase.auth.updateUser({ password: input.data.password });
  if (error) {
    const code = error.code ?? '';
    return {
      ok: false,
      message: Object.hasOwn(PASSWORD_REFUSALS, code) ? PASSWORD_REFUSALS[code] : UNEXPECTED,
    };
  }

  /* A reset is usually "someone else may have it": end every other session. */
  await supabase.auth.signOut({ scope: 'others' });

  redirect(ROUTES.PORTAL);
}

export async function signOutClient(): Promise<never> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect(`${ROUTES.PORTAL_LOGIN}?${NOTICE_PARAM}=${PORTAL_NOTICE.SIGNED_OUT}`);
}
