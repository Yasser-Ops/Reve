'use client';

import { useCountdown } from '@/lib/hooks/useCountdown';

const UNITS = [
  { key: 'days', label: 'Days' },
  { key: 'hours', label: 'Hours' },
  { key: 'minutes', label: 'Minutes' },
  { key: 'seconds', label: 'Seconds' },
] as const;

/**
 * Lin's countdown, in its script face — per the brief, titles and numbers
 * share it.
 *
 * Its own file so the client boundary stays here rather than at the top of the
 * template: Lin is otherwise a Server Component, and a ticking dial is the one
 * thing on the page that needs a clock.
 *
 * Renders nothing before mount or once the date has passed. `useCountdown`
 * returns null for both, which is also what keeps server and client markup in
 * agreement on a page whose whole job is loading fast.
 */
export function CountdownDial({ eventDate }: { eventDate: string }) {
  const parts = useCountdown(eventDate);

  if (!parts) return null;

  return (
    <ul
      className="flex justify-center gap-8 px-6 py-20 md:py-28"
      style={{
        WebkitFontSmoothing: 'antialiased',
        textRendering: 'optimizeLegibility',
      }}
    >
      {UNITS.map((unit) => (
        <li key={unit.key}>
          <p className="text-5xl" style={{ fontFamily: 'var(--font-lin-script)' }}>
            {parts[unit.key]}
          </p>
          <p className="mt-2 text-[11px] uppercase tracking-[0.18em]">{unit.label}</p>
        </li>
      ))}
    </ul>
  );
}
