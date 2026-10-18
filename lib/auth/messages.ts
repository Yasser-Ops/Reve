/*
 * Kept out of lib/auth/actions.ts: a 'use server' module may export only
 * async functions, and the login page reads these directly.
 */

export const SIGN_IN_MESSAGES = {
  INVALID_INPUT: 'Enter your email address and password.',
  BAD_CREDENTIALS: 'That email and password do not match an account.',
  NOT_ADMIN: 'This account does not have admin access.',
} as const;

/** Only failure comes back: success redirects and never returns. */
export type SignInResult = { ok: false; message: string };

/** Bounds for a new password. 72 is where bcrypt stops reading. */
export const PASSWORD_RULES = { MIN: 8, MAX: 72 } as const;

export const PASSWORD_MESSAGES = {
  TOO_SHORT: `Use at least ${PASSWORD_RULES.MIN} characters.`,
  TOO_LONG: `Use at most ${PASSWORD_RULES.MAX} characters.`,
  SAME_AS_EMAIL: 'Choose a password that is not your email address.',
  MISMATCH: 'The two new passwords do not match.',
  UNCHANGED: 'That is already your password.',
  WRONG_CURRENT: 'Your current password is not right.',
  WEAK: 'Supabase rejected that password as too weak. Try a longer one.',
  CHANGED: 'Password changed. Other devices were signed out.',
  CHANGED_OTHERS_KEPT:
    'Password changed, but other devices could not be signed out. Sign out there yourself.',
} as const;

export const PORTAL_MESSAGES = {
  NOT_CLIENT: 'This email is not a Rêve client account.',
  SIGNED_OUT: 'You are signed out.',
  LINK_EXPIRED: 'That link has expired or was already used. Message us on WhatsApp for a new one.',
  PASSWORD_RESET: 'Check your email for a link to choose a new password.',
  RESET_LINK_SENT:
    'If that email belongs to a Rêve account, a link to choose a new password is on its way.',
} as const;
