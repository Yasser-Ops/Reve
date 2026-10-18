import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: { template: '%s · Rêve', default: 'Rêve' },
  robots: { index: false, follow: false },
};

/** Metadata only; the login and gated segments each wrap themselves in AppSurface. */
export default function PortalLayout({ children }: { children: ReactNode }) {
  return children;
}
