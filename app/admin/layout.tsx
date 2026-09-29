import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: { template: '%s · Rêve admin', default: 'Rêve admin' },
  robots: { index: false, follow: false },
};

/**
 * Every admin page renders inside `data-surface="app"`, the one attribute
 * that switches shadcn's tokens and base styles on. The storefront never
 * carries it.
 */
export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className="min-h-dvh text-[14px]"
      data-surface="app"
      style={{ WebkitFontSmoothing: 'antialiased', textRendering: 'optimizeLegibility' }}
    >
      {children}
    </div>
  );
}
