import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { cormorant, geist, marcellus } from './fonts';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Rêve',
    template: '%s · Rêve',
  },
  description: 'Digital wedding invitations, designed by hand.',
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
