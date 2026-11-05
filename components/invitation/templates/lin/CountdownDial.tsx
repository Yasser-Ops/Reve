'use client';

import { Fragment } from 'react';
import { useCountdown } from '@/lib/hooks/useCountdown';
import { LIN } from './palette';

const UNITS = [
  { key: 'days', label: 'Days' },
  { key: 'hours', label: 'Hours' },
  { key: 'minutes', label: 'Mins' },
  { key: 'seconds', label: 'Secs' },
] as const;

/* Days run to any length; the clock units always show two digits, as in the mock. */
const show = (key: (typeof UNITS)[number]['key'], value: number) =>
  key === 'days' ? String(value) : String(value).padStart(2, '0');

/**
 * Lin's countdown as the approved mock sets it: one line of light Cormorant
 * numerals joined by colons, `203:06:51:04`, with a small capital under each
 * number. Lining figures, because Cormorant's default old-style ones bob up
 * and down and read as lowercase.
 *
 * A grid rather than one string: each label has to sit centred under its own
 * number, and the colons get columns of their own so they never push a number
 * off its label. The size follows the viewport so a four-digit day count still
 * fits a phone.
 *
 * Its own file so the client boundary stays here: Lin is otherwise a Server
 * Component, and a ticking dial is the one thing on the page that needs a
 * clock. Renders nothing before mount or once the date has passed;
 * `useCountdown` returns null for both, which keeps server and client markup
 * in agreement.
 */
export function CountdownDial({ eventDate }: { eventDate: string }) {
  const parts = useCountdown(eventDate);

  if (!parts) return null;

  return (
    <div
      className="mx-auto grid w-fit grid-cols-[auto_auto_auto_auto_auto_auto_auto] items-baseline px-4 pt-8 pb-20 md:pb-28"
      role="timer"
      style={{
        WebkitFontSmoothing: 'antialiased',
        textRendering: 'optimizeLegibility',
        color: LIN.NUMERAL,
      }}
    >
      {UNITS.map((unit, index) => (
        <Fragment key={unit.key}>
          {index > 0 ? (
            <span
              aria-hidden
              className="row-start-1 px-0.5 text-[clamp(40px,12vw,72px)] leading-none font-light"
              style={{ gridColumn: index * 2 }}
            >
              :
            </span>
          ) : null}
          <span
            className="row-start-1 text-center text-[clamp(40px,12vw,72px)] leading-none font-light tabular-nums lining-nums"
            style={{ gridColumn: index * 2 + 1 }}
          >
            {show(unit.key, parts[unit.key])}
            <span className="sr-only"> {unit.label}</span>
          </span>
          <span
            aria-hidden
            className="row-start-2 mt-3 text-center text-[11px] uppercase tracking-[0.12em]"
            style={{ gridColumn: index * 2 + 1, color: LIN.LABEL }}
          >
            {unit.label}
          </span>
        </Fragment>
      ))}
    </div>
  );
}
