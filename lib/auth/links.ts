import { ROUTES } from '@/lib/routes';
import { SITE_URL } from '@/lib/site';

/*
 * Kept out of lib/routes.ts: next.config.ts loads that file without the `@/`
 * alias, so it must stay free of imports.
 */

/** The link invite and reset emails carry; `next` is where to go once signed in. */
export function confirmUrl(next: string): string {
  return `${SITE_URL}${ROUTES.AUTH_CONFIRM}?next=${encodeURIComponent(next)}`;
}
