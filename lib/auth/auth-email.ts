import 'server-only';
import { confirmLink, type AuthLinkType } from '@/lib/auth/links';
import { createAdminClient } from '@/lib/supabase/admin';

type AdminClient = ReturnType<typeof createAdminClient>;

/** A failed generateLink, with the codes the callers word differently. */
export type AuthLinkError = { code?: string; status?: number };

/**
 * Mints an invite or recovery token with the service role and wraps it in our
 * own /auth/confirm link. Supabase sends nothing: the email is ours.
 *
 * An `invite` creates the auth user when it does not exist yet, which is why
 * the user comes back with the link.
 */
export async function mintAuthLink(
  admin: AdminClient,
  input: { type: AuthLinkType; email: string; next: string },
): Promise<{ url: string; userId: string } | { error: AuthLinkError }> {
  const { data, error } = await admin.auth.admin.generateLink({
    type: input.type,
    email: input.email,
  });
  if (error || !data.user || !data.properties?.hashed_token) {
    return { error: error ?? {} };
  }

  return {
    userId: data.user.id,
    url: confirmLink({
      tokenHash: data.properties.hashed_token,
      type: input.type,
      next: input.next,
    }),
  };
}

/*
 * The throttle on our own auth emails. Supabase rate-limited the emails it
 * sent; this replaces that for the ones we send. One per address per minute
 * stops a double-tap from sending twice, and five an hour stops anyone using
 * the public reset form to flood a client's inbox or spend the daily quota.
 */
const COOLDOWN_MS = 60 * 1000;
const HOURLY_LIMIT = 5;
const HOUR_MS = 60 * 60 * 1000;

export async function mayEmail(
  admin: AdminClient,
  email: string,
  kind: AuthLinkType,
): Promise<boolean> {
  const { data, error } = await admin
    .from('auth_email_sends')
    .select('sent_at')
    .eq('email', email)
    .eq('kind', kind)
    .gte('sent_at', new Date(Date.now() - HOUR_MS).toISOString())
    .order('sent_at', { ascending: false })
    .limit(HOURLY_LIMIT);
  /* Closed on error: an unreadable log must not become an open relay. */
  if (error) throw new Error(`auth email log unreadable: ${error.message}`);

  if (data.length >= HOURLY_LIMIT) return false;
  const latest = data[0]?.sent_at;
  return !latest || Date.now() - new Date(latest).getTime() >= COOLDOWN_MS;
}

export async function recordEmail(
  admin: AdminClient,
  email: string,
  kind: AuthLinkType,
): Promise<void> {
  const { error } = await admin.from('auth_email_sends').insert({ email, kind });
  if (error) console.error('Recording an auth email failed', error);
}
