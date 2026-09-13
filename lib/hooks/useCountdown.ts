'use client';

import { useEffect, useState } from 'react';
import { timeUntil, type CountdownParts } from '@/lib/countdown';

/**
 * Time remaining until `eventDate`, ticking once a second.
 *
 * A hook rather than a component on purpose. The shared `Countdown` component
 * it replaces had grown a `bare` flag and a `numeralClassName` prop, one for
 * each template that wanted its own dial — the shape a shared component takes
 * when designs that should own their layout are made to negotiate for it. A
 * hook has nothing to negotiate over: it hands back four numbers and each
 * design draws its own dial.
 *
 * Null until mounted, so server and client agree on markup and the page whose
 * whole job is loading fast never hydration-mismatches. Null again once the
 * date has passed, so a caller renders nothing without checking `hasPassed`.
 */
export function useCountdown(eventDate: string): CountdownParts | null {
  const [parts, setParts] = useState<CountdownParts | null>(null);

  useEffect(() => {
    const target = new Date(eventDate);
    const tick = () => setParts(timeUntil(target, new Date()));

    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [eventDate]);

  if (!parts || parts.hasPassed) return null;

  return parts;
}
