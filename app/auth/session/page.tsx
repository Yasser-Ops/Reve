import type { Metadata } from 'next';
import { SessionFromHash } from './SessionFromHash';
import { z } from 'zod';
import { safeNext } from '@/lib/routes';

/* Public, so it is not covered by the /portal noindex headers. */
export const metadata: Metadata = {
  title: 'Signing in',
  robots: { index: false, follow: false },
};

const QuerySchema = z.object({ next: z.string().optional() });

export default async function AuthSessionPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = QuerySchema.safeParse(await searchParams);
  const next = safeNext(query.success ? (query.data.next ?? null) : null);

  return (
    <main className="grid min-h-dvh place-items-center px-4">
      <p className="text-sm text-muted-foreground">Signing you in…</p>
      <SessionFromHash next={next} />
    </main>
  );
}
