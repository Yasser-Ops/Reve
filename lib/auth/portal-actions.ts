'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { UNEXPECTED, type ActionResult } from '@/lib/admin/action-result';
import { getClientForUser } from '@/lib/auth/client-membership';
import { requireClient, requireClientAccount } from '@/lib/auth/guards';
import {
  PASSWORD_MESSAGES,
  PORTAL_MESSAGES,
  SIGN_IN_MESSAGES,
  type SignInResult,
} from '@/lib/auth/messages';
import { changePasswordAs, updatePasswordOrRefuse } from '@/lib/auth/password-change';
import { passwordSchema } from '@/lib/auth/password';
import { getRecoveryClient } from '@/lib/auth/recovery';
import { confirmUrl } from '@/lib/auth/links';
import { NOTICE_PARAM, PORTAL_NOTICE, ROUTES } from '@/lib/routes';
import { createAdminClient } from '@/lib/supabase/admin';
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

  let isClient: boolean;
  try {
    isClient = (await getClientForUser(supabase, data.user.id)) !== null;
  } catch (error) {
    /* A form never gets a throw. Sign out so a half-finished sign-in does not
       linger as a session. */
    console.error('Client lookup failed during sign-in', error);
    await supabase.auth.signOut({ scope: 'local' });
    return { ok: false, message: UNEXPECTED };
  }

  if (!isClient) {
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

  /* Logged, never shown: the answer must not depend on the account existing. */
  try {
    const { error } = await createMailClient().auth.resetPasswordForEmail(parsed.data.email, {
      redirectTo: confirmUrl(ROUTES.PORTAL_RESET),
    });
    if (error) console.error('Password reset email failed', error);
  } catch (error) {
    console.error('Password reset email threw', error);
  }

  return { ok: true };
}

/**
 * Sets the password for a client the recovery link signed in. No current
 * password is asked for: holding the emailed link is the proof, which is why
 * only a session marked as recovery (see getRecoveryClient) may do this.
 */
export async function setNewPassword(
  _previous: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const supabase = await createClient();
  const person = await getRecoveryClient(supabase);
  if (!person) {
    redirect(`${ROUTES.PORTAL_LOGIN}?${NOTICE_PARAM}=${PORTAL_NOTICE.LINK_EXPIRED}`);
  }

  const input = z
    .object({ password: passwordSchema(person.email), confirm: z.string() })
    .refine((value) => value.confirm === value.password, PASSWORD_MESSAGES.MISMATCH)
    .safeParse({
      password: formData.get('password') ?? '',
      confirm: formData.get('confirm') ?? '',
    });
  if (!input.success) return { ok: false, message: input.error.issues[0].message };

  const refusal = await updatePasswordOrRefuse(supabase, input.data.password);
  if (refusal) return refusal;

  /* A reset is usually "someone else may have it": end every other session.
     If that fails the password has still changed, so the client goes on to
     the portal and is told, rather than being left on a form that worked. */
  const { error: signOutError } = await supabase.auth.signOut({ scope: 'others' });
  if (signOutError) redirect(`${ROUTES.PORTAL}?${NOTICE_PARAM}=${PORTAL_NOTICE.OTHERS_KEPT}`);

  redirect(ROUTES.PORTAL);
}

/**
 * The welcome step: an invited client chooses a password and accepts the
 * terms. The password goes through the signed-in session; the terms stamp goes
 * through the admin client because clients cannot write their own row. If the
 * stamp fails the password change stands, and resubmitting is safe.
 */
export async function acceptInvite(
  _previous: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const identity = await requireClientAccount();
  if (identity.termsAcceptedAt !== null) redirect(ROUTES.PORTAL);

  const input = z
    .object({
      password: passwordSchema(identity.email),
      confirm: z.string(),
      terms: z.literal('on', PORTAL_MESSAGES.TERMS_REQUIRED),
    })
    .refine((value) => value.confirm === value.password, PASSWORD_MESSAGES.MISMATCH)
    .safeParse({
      password: formData.get('password') ?? '',
      confirm: formData.get('confirm') ?? '',
      terms: formData.get('terms'),
    });
  if (!input.success) return { ok: false, message: input.error.issues[0].message };

  /* "Already your password" means an earlier submit set it and the stamp
     failed: go on to the stamp, or the retry promised below could never work. */
  const refusal = await updatePasswordOrRefuse(await createClient(), input.data.password);
  const alreadySet = refusal?.ok === false && refusal.message === PASSWORD_MESSAGES.UNCHANGED;
  if (refusal && !alreadySet) return refusal;

  /* The null filter keeps a repeated submit from moving the first timestamp. */
  const { error } = await createAdminClient()
    .from('clients')
    .update({ terms_accepted_at: new Date().toISOString() })
    .eq('user_id', identity.userId)
    .is('terms_accepted_at', null);
  if (error) {
    console.error('Stamping terms acceptance failed', error);
    return { ok: false, message: UNEXPECTED };
  }

  redirect(ROUTES.PORTAL);
}

/** The settings form: a signed-in client changes their own password. */
export async function changeClientPassword(
  _previous: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  return changePasswordAs(await requireClient(), formData);
}

export async function signOutClient(): Promise<never> {
  /* Local only: signing out a shared tablet must not end the couple's
     session on their own phone. */
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: 'local' });
  redirect(`${ROUTES.PORTAL_LOGIN}?${NOTICE_PARAM}=${PORTAL_NOTICE.SIGNED_OUT}`);
}
