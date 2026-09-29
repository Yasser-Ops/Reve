'use client';

import { Button } from '@/components/ui/button';

/* The error's message is deliberately not shown: it can carry database or
   auth internals. The digest in the server log is where to look. */
export default function AdminError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto max-w-md px-6 py-24 text-center">
      <h1 className="text-lg font-medium">Something went wrong</h1>
      <p className="mt-2 text-muted-foreground">
        The page failed to load. Try again, and if it keeps failing, check the
        Supabase project is running.
      </p>
      <Button className="mt-6" onClick={reset}>
        Try again
      </Button>
    </main>
  );
}
