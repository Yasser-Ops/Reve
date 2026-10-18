import type { Metadata } from 'next';
import { SessionFromHash } from './SessionFromHash';
import { safeNext } from '@/lib/routes';

/* Public, so it is not covered by the /portal noindex headers. */
export const metadata: Metadata = {
  title: 'Signing in',
  robots: { index: false, follow: false },
};

export default async function AuthSessionPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = (await searchParams).next;
  const next = safeNext(typeof raw === 'string' ? raw : null);

  return (
    <main className="grid min-h-dvh place-items-center px-4">
      <p className="text-sm text-muted-foreground">Signing you in…</p>
      <SessionFromHash next={next} />
    </main>
  );
}
