'use client';

import { useEffect, useState } from 'react';
import { Section } from './Section';
import { timeUntil, type CountdownParts } from '@/lib/countdown';

type CountdownProps = {
  eventDate: string;
};

const UNITS: Array<{ key: keyof Omit<CountdownParts, 'hasPassed'>; label: string }> = [
  { key: 'days', label: 'Days' },
  { key: 'hours', label: 'Hours' },
  { key: 'minutes', label: 'Minutes' },
  { key: 'seconds', label: 'Seconds' },
];

/**
 * Renders nothing until mounted, so the server and client agree on markup and
 * no hydration mismatch occurs on a page whose whole job is loading fast.
 */
export function Countdown({ eventDate }: CountdownProps) {
  const [parts, setParts] = useState<CountdownParts | null>(null);

  useEffect(() => {
    const target = new Date(eventDate);
    const tick = () => setParts(timeUntil(target, new Date()));

    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [eventDate]);

  if (!parts || parts.hasPassed) return null;

  return (
    <Section className="text-center">
      <ul
        className="flex justify-center gap-8"
        style={{
          WebkitFontSmoothing: 'antialiased',
          textRendering: 'optimizeLegibility',
        }}
      >
        {UNITS.map((unit) => (
          <li key={unit.key}>
            <p className="text-4xl tabular-nums">{parts[unit.key]}</p>
            <p className="mt-2 text-[11px] uppercase tracking-[0.18em]">{unit.label}</p>
          </li>
        ))}
      </ul>
    </Section>
  );
}
