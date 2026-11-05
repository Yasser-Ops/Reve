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
 * Equal grid columns with each number centred over its label: a flex row of
 * auto-width items let a four-digit day count push the row off a phone and
 * left every label hanging under the start of its number.
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
      className="mx-auto grid max-w-xl grid-cols-4 gap-1 px-4 py-20 sm:gap-4 md:py-28"
      style={{
        WebkitFontSmoothing: 'antialiased',
        textRendering: 'optimizeLegibility',
      }}
    >
      {UNITS.map((unit) => (
        <li className="flex flex-col items-center text-center" key={unit.key}>
          <p
            className="text-[34px] leading-none tabular-nums sm:text-5xl"
            style={{ fontFamily: 'var(--font-lin-script)' }}
          >
            {parts[unit.key]}
          </p>
          <p className="mt-3 text-[11px] uppercase tracking-[0.12em] sm:tracking-[0.18em]">
            {unit.label}
          </p>
        </li>
      ))}
    </ul>
  );
}
