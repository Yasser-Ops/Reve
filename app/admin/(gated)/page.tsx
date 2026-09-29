import type { Metadata } from 'next';
import { requireAdmin } from '@/lib/auth/guards';

export const metadata: Metadata = { title: 'Clients' };

/* Phase 2 turns this into the client list. The guard is repeated here, not
   left to the layout: see requireAdmin. */
export default async function AdminHomePage() {
  await requireAdmin();

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="text-xl font-medium">Clients</h1>
      <p className="mt-2 text-muted-foreground">No clients yet.</p>
    </main>
  );
}
