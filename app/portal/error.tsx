'use client';

import { AppSurface } from '@/components/admin/AppSurface';
import { Button } from '@/components/ui/button';

/* The error's message is deliberately not shown: it can carry database or
   auth internals. `retry` re-fetches the segment; `reset` would not. */
export default function PortalError({
  retry,
}: {
  error: Error;
  retry: () => void;
  reset: () => void;
}) {
  return (
    <AppSurface>
      <main className="mx-auto max-w-md px-6 py-24 text-center">
        <h1 className="text-lg font-medium">Something went wrong</h1>
        <p className="mt-2 text-muted-foreground">
          The page failed to load. Try again in a moment.
        </p>
        <Button className="mt-6" onClick={retry}>
          Try again
        </Button>
      </main>
    </AppSurface>
  );
}
