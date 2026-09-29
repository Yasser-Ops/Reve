/** Every route the app links to or redirects to by name. */
export const ROUTES = {
  ADMIN: '/admin',
  ADMIN_LOGIN: '/admin/login',
  ADMIN_NEW_CLIENT: '/admin/clients/new',
} as const;

/** Admin pages addressed by id. */
export const adminRoutes = {
  client: (id: string) => `/admin/clients/${id}`,
  invitation: (id: string) => `/admin/invitations/${id}`,
  /** The bare draft render, outside the admin surface's styles. */
  preview: (id: string) => `/admin/preview/${id}`,
} as const;

/**
 * Routes that belong to a signed-in person. proxy.ts refreshes the session on
 * exactly these, and next.config.ts marks them noindex. Public pages, and
 * above all the guest's invitation, never pay for an auth check.
 */
export const PRIVATE_ROUTE_PATTERNS = ['/admin/:path*', '/portal/:path*'] as const;

/** Why the login page is being shown, carried in `?notice=`. */
export const LOGIN_NOTICE_PARAM = 'notice';

export const LOGIN_NOTICE = {
  NOT_ADMIN: 'not-admin',
} as const;

export type LoginNotice = (typeof LOGIN_NOTICE)[keyof typeof LOGIN_NOTICE];
