import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: { template: '%s · Rêve admin', default: 'Rêve admin' },
  robots: { index: false, follow: false },
};

/**
 * Metadata only. The admin surface is applied by the segments that are admin
 * UI (`AppSurface`); the draft preview under `/admin/preview` renders a design
 * and must stay bare, or shadcn's base styles would repaint it.
 */
export default function AdminLayout({ children }: { children: ReactNode }) {
  return children;
}
