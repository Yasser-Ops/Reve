export type AccountState = 'not_invited' | 'invited' | 'active';

/**
 * Where a client is on the way to the portal. The invite stores `user_id`;
 * accepting the terms on the welcome page is what makes the account theirs.
 */
export function accountState(client: {
  user_id: string | null;
  terms_accepted_at: string | null;
}): AccountState {
  if (!client.user_id) return 'not_invited';
  return client.terms_accepted_at ? 'active' : 'invited';
}
