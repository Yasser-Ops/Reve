'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

export const LIVE_TABLE = {
  REVIEWS: 'invitation_reviews',
  ORDERS: 'orders',
} as const;

export type LiveTable = (typeof LIVE_TABLE)[keyof typeof LIVE_TABLE];

export const LIVE_CHANNEL = 'live-refresh';
const REALTIME_EVENT = 'postgres_changes';
const CHANGE_EVENTS = ['INSERT', 'UPDATE'] as const;
const REALTIME_SCHEMA = 'public';
const EVENT_DEBOUNCE_MS = 500;
const FOCUS_THROTTLE_MS = 5000;

/**
 * Refreshes the page's server data when a client decision or an order move
 * lands, and when the tab comes back into view. Renders nothing.
 *
 * Shared by admin and the portal. RLS decides which rows' changes reach the
 * browser, so a client only ever hears about their own invitation and order.
 */
export function LiveRefresh({ tables }: { tables: readonly LiveTable[] }) {
  const router = useRouter();
  const key = tables.join(',');

  useEffect(() => {
    const watched = key.split(',') as LiveTable[];
    const supabase = createClient();
    let timer: ReturnType<typeof setTimeout> | null = null;
    let lastFocusRefresh = Number.NEGATIVE_INFINITY;

    function onEvent() {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = null;
        router.refresh();
      }, EVENT_DEBOUNCE_MS);
    }

    function onReturn() {
      if (document.visibilityState !== 'visible') return;
      const now = Date.now();
      if (now - lastFocusRefresh < FOCUS_THROTTLE_MS) return;
      lastFocusRefresh = now;
      router.refresh();
    }

    let channel = supabase.channel(`${LIVE_CHANNEL}:${key}`);
    for (const table of watched) {
      for (const event of CHANGE_EVENTS) {
        channel = channel.on(REALTIME_EVENT, { event, schema: REALTIME_SCHEMA, table }, onEvent);
      }
    }
    channel.subscribe();

    document.addEventListener('visibilitychange', onReturn);
    window.addEventListener('focus', onReturn);
    return () => {
      if (timer) clearTimeout(timer);
      document.removeEventListener('visibilitychange', onReturn);
      window.removeEventListener('focus', onReturn);
      void supabase.removeChannel(channel);
    };
  }, [key, router]);

  return null;
}
