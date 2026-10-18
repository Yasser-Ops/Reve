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
  /** Ends the local session, then shows the portal login. A route because render cannot write cookies. */
  AUTH_SIGNOUT: '/auth/signout',
} as const;

/** Admin pages addressed by id. */
export const adminRoutes = {
  client: (id: string) => `/admin/clients/${id}`,
  invitation: (id: string) => `/admin/invitations/${id}`,
  /** The bare draft render, outside the admin surface's styles. */
  preview: (id: string) => `/admin/preview/${id}`,
} as const;

/** Public pages addressed by slug. */
export const publicRoutes = {
  invitation: (slug: string) => `/i/${encodeURIComponent(slug)}`,
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

/** How the client's draft preview is framed, carried in `?view=`. */
export const VIEW_PARAM = 'view';

export const PREVIEW_VIEW = {
  /** The invitation inside the shared phone, envelope first. */
  PHONE: 'phone',
  /** The invitation filling the window, as on a guest's phone. */
  FULL: 'full',
} as const;

export type PreviewView = (typeof PREVIEW_VIEW)[keyof typeof PREVIEW_VIEW];

/** Why a page is showing a notice, carried in `?notice=`. */
export const NOTICE_PARAM = 'notice';

/** Notices the clients list shows after an action sent the admin there. */
export const ADMIN_NOTICE = {
  CLIENT_DELETED: 'client-deleted',
  CLIENT_DELETED_FILES_LEFT: 'client-deleted-files-left',
  CLIENT_DELETED_ACCOUNT_LEFT: 'client-deleted-account-left',
} as const;

export const LOGIN_NOTICE = {
  NOT_ADMIN: 'not-admin',
} as const;

export type LoginNotice = (typeof LOGIN_NOTICE)[keyof typeof LOGIN_NOTICE];

/** Notices the portal shows: the login page reads most, the dashboard OTHERS_KEPT. */
export const PORTAL_NOTICE = {
  LINK_EXPIRED: 'link-expired',
  NOT_CLIENT: 'not-client',
  SIGNED_OUT: 'signed-out',
  /** A reset changed the password but could not end the other sessions. */
  OTHERS_KEPT: 'others-kept',
} as const;

export type PortalNotice = (typeof PORTAL_NOTICE)[keyof typeof PORTAL_NOTICE];

/**
 * The only place an auth link may send a person afterwards. A `next` that
 * leaves /portal (an absolute URL, a protocol-relative one) would turn the
 * confirm route into an open redirect, so it falls back to the portal home.
 */
export function safeNext(next: string | null): string {
  const home: string = ROUTES.PORTAL;
  if (!next || next.includes('\\')) return home;

  /* Resolve dot segments (including %2e forms) before judging the path, so
     /portal/../admin cannot pass a prefix check and then land elsewhere. */
  const base = 'http://portal.invalid';
  let url: URL;
  try {
    url = new URL(next, base);
  } catch {
    return home;
  }
  if (url.origin !== base) return home;

  const { pathname, search } = url;
  const inPortal = pathname === home || pathname.startsWith(`${home}/`);
  /* A doubled slash or an encoded percent is how a path gets decoded into
     something else one hop later. */
  if (!inPortal || pathname.includes('//') || /%25/i.test(pathname)) return home;
  return pathname + search;
}
