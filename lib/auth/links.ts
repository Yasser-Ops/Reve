import { ROUTES } from '@/lib/routes';
import { SITE_URL } from '@/lib/site';

/*
 * Kept out of lib/routes.ts: next.config.ts loads that file without the `@/`
 * alias, so it must stay free of imports.
 */

/** The two kinds of link Rêve emails; /auth/confirm verifies exactly these. */
export const AUTH_LINK_TYPES = ['invite', 'recovery'] as const;
export type AuthLinkType = (typeof AUTH_LINK_TYPES)[number];

/**
 * The link an invite or reset email carries. The token is verified on our own
 * /auth/confirm, on the server, so the session cookie is set before `next`
 * renders; `next` is where the person goes once signed in.
 */
export function confirmLink(input: { tokenHash: string; type: AuthLinkType; next: string }): string {
  const query = new URLSearchParams({
    token_hash: input.tokenHash,
    type: input.type,
    next: input.next,
  });
  return `${SITE_URL}${ROUTES.AUTH_CONFIRM}?${query}`;
}
