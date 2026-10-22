import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { cormorant, geist, marcellus } from './fonts';
import { socialMetadata } from '@/lib/metadata';
import { SITE_URL } from '@/lib/site';
import './globals.css';

const DESCRIPTION =
  'Digital invitations for weddings, engagements, and the evenings in between. Designed by hand in Lebanon.';

export const metadata: Metadata = {
  /* Every page's `alternates.canonical` and `openGraph` fields are relative —
     "/weddings", not "https://…/weddings" — and Next resolves those against
     this. Without it they resolve against localhost in production, which is
     why the working canonical and the sharable Open Graph preview did not
     exist yet: nothing broken to see locally, silently wrong once deployed. */
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Rêve',
    template: '%s · Rêve',
  },
  description: DESCRIPTION,
  /* The fallback preview for any page that sets none of its own. */
  ...socialMetadata({ title: 'Rêve', description: DESCRIPTION }),
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className={`${marcellus.variable} ${geist.variable} ${cormorant.variable} h-full`}
    >
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
