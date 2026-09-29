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
