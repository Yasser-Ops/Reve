import { SITE_URL } from '@/lib/site';

/** Every route the app links to or redirects to by name. */
export const ROUTES = {
  ADMIN: '/admin',
  ADMIN_LOGIN: '/admin/login',
  ADMIN_NEW_CLIENT: '/admin/clients/new',
  ADMIN_SETTINGS: '/admin/settings',
  PORTAL: '/portal',
  PORTAL_LOGIN: '/portal/login',
  PORTAL_FORGOT: '/portal/forgot',
  PORTAL_RESET: '/portal/reset',
  PORTAL_WELCOME: '/portal/welcome',
  PORTAL_SETTINGS: '/portal/settings',
  /** Where invite and reset emails land. Public: it signs the person in. */
  AUTH_CONFIRM: '/auth/confirm',
  /** Fallback for links that carry the session in the URL fragment. */
  AUTH_SESSION: '/auth/session',
} as const;

/** Admin pages addressed by id. */
export const adminRoutes = {
  client: (id: string) => `/admin/clients/${id}`,
  invitation: (id: string) => `/admin/invitations/${id}`,
  /** The bare draft render, outside the admin surface's styles. */
  preview: (id: string) => `/admin/preview/${id}`,
} as const;

/** Portal pages addressed by id. */
export const portalRoutes = {
  preview: (id: string) => `/portal/preview/${id}`,
} as const;

/**
 * Routes that belong to a signed-in person. proxy.ts refreshes the session on
 * exactly these, and next.config.ts marks them noindex. Public pages, and
 * above all the guest's invitation, never pay for an auth check.
 */
export const PRIVATE_ROUTE_PATTERNS = ['/admin/:path*', '/portal/:path*'] as const;

/** Why a page is showing a notice, carried in `?notice=`. */
export const NOTICE_PARAM = 'notice';

/** Notices the clients list shows after an action sent the admin there. */
export const ADMIN_NOTICE = {
  CLIENT_DELETED: 'client-deleted',
  CLIENT_DELETED_FILES_LEFT: 'client-deleted-files-left',
} as const;

export const LOGIN_NOTICE = {
  NOT_ADMIN: 'not-admin',
} as const;

export type LoginNotice = (typeof LOGIN_NOTICE)[keyof typeof LOGIN_NOTICE];

export const PORTAL_NOTICE = {
  LINK_EXPIRED: 'link-expired',
  NOT_CLIENT: 'not-client',
  PASSWORD_RESET: 'password-reset',
  SIGNED_OUT: 'signed-out',
} as const;

export type PortalNotice = (typeof PORTAL_NOTICE)[keyof typeof PORTAL_NOTICE];

/**
 * The only place an auth link may send a person afterwards. A `next` that
 * leaves /portal (an absolute URL, a protocol-relative one) would turn the
 * confirm route into an open redirect, so it falls back to the portal home.
 */
export function safeNext(next: string | null): string {
  const home: string = ROUTES.PORTAL;
  if (!next) return home;
  const inPortal =
    next === home || next.startsWith(`${home}/`) || next.startsWith(`${home}?`);
  return inPortal ? next : home;
}

/** The link invite and reset emails carry; `next` is where to go once signed in. */
export function confirmUrl(next: string): string {
  return `${SITE_URL}${ROUTES.AUTH_CONFIRM}?next=${encodeURIComponent(next)}`;
}
