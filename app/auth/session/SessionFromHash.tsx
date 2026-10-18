'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/client';
import { NOTICE_PARAM, PORTAL_NOTICE, ROUTES, safeNext } from '@/lib/routes';

const FragmentSchema = z.object({
  access_token: z.string().min(1),
  refresh_token: z.string().min(1),
});

/**
 * Reads the session Supabase's verify endpoint put in the URL fragment and
 * stores it in the browser client's cookies. Only the browser can do this:
 * the fragment never reaches a server.
 */
export function SessionFromHash({ next }: { next: string }) {
  const router = useRouter();

  useEffect(() => {
    const expired = () =>
      router.replace(
        `${ROUTES.PORTAL_LOGIN}?${NOTICE_PARAM}=${PORTAL_NOTICE.LINK_EXPIRED}`,
      );

    const fragment = FragmentSchema.safeParse(
      Object.fromEntries(new URLSearchParams(window.location.hash.slice(1))),
    );
    /* Tokens must not outlive this read: out of the address bar and the
       history entry before any network call can fail. */
    window.history.replaceState(
      null,
      '',
      window.location.pathname + window.location.search,
    );
    if (!fragment.success) {
      expired();
      return;
    }

    createClient()
      .auth.setSession(fragment.data)
      .then(({ error }) => {
        if (error) expired();
        else router.replace(safeNext(next));
      })
      .catch(expired);
  }, [next, router]);

  return null;
}
