/** Every route the app links to or redirects to by name. */
export const ROUTES = {
  ADMIN: '/admin',
  ADMIN_LOGIN: '/admin/login',
  ADMIN_NEW_CLIENT: '/admin/clients/new',
  ADMIN_SETTINGS: '/admin/settings',
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
