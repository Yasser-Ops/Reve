import Script from 'next/script';
import type { ReactNode } from 'react';
import { TRACKER_ASSET_ID, TRACKER_SRC } from '@/lib/analytics';
import { SiteFooter } from '@/components/store/SiteFooter';
import { SiteNav } from '@/components/store/SiteNav';

/**
 * Storefront chrome.
 *
 * Scoped to this route group so live invitations at /i/[slug] never inherit
 * it: a guest opening a wedding invitation must not see Rêve's navigation
 * over the couple's page.
 */
export default function StoreLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full flex-col">
      <Script data-asset={TRACKER_ASSET_ID} src={TRACKER_SRC} />
      <SiteNav />
      <div className="flex-1">{children}</div>
      <SiteFooter />
    </div>
  );
}
