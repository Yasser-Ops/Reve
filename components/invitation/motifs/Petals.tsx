'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import './petals.css';
import type { Theme } from '@/lib/schemas/invitation';

/**
 * Rose petals falling continuously behind the whole invitation.
 *
 * A MOTIF, not a layout primitive: it paints over a design without dictating
 * anything about its structure, so any template may opt in and none inherits
 * a silhouette by doing so. That is the line this directory draws — motifs
 * are shared, layout is not.
 *
 * Fixed rather than per-band: a petal that resets at every section boundary
 * reads as a repeating loop, so one layer spans the viewport and the bands
 * scroll past it. Fixed positioning also means the count stays constant
 * however long the invitation runs.
 *
 * Purely decorative, so `aria-hidden` and never focusable. Motion stops both
 * for a `reduced` theme (here) and for `prefers-reduced-motion` (in
 * petals.css): continuous background movement is exactly what that preference
 * exists to silence.
 */

const PETAL_COUNT = 14;

/* Hand-spread rather than random: a fresh Math.random() on every render would
   disagree between server and client and throw a hydration mismatch, and a
   seeded generator is more machinery than placing fourteen values by hand. */
/* Durations are long because the fall now spans the whole document rather than
   one screen: a petal crossing several thousand pixels in twenty seconds reads
   as rain. These are tuned so a petal drifts past at roughly walking pace. */
const PETALS = [
  { left: 4, size: 26, delay: 0, duration: 78, sway: 40, spin: 220, art: 1 },
  { left: 12, size: 18, delay: 29, duration: 96, sway: -28, spin: -180, art: 4 },
  { left: 19, size: 32, delay: 12, duration: 68, sway: 52, spin: 300, art: 7 },
  { left: 27, size: 21, delay: 45, duration: 104, sway: -36, spin: -240, art: 2 },
  { left: 34, size: 28, delay: 4, duration: 84, sway: 30, spin: 260, art: 5 },
  { left: 42, size: 16, delay: 57, duration: 112, sway: -44, spin: -200, art: 8 },
  { left: 49, size: 30, delay: 20, duration: 72, sway: 38, spin: 280, art: 3 },
  { left: 57, size: 22, delay: 37, duration: 92, sway: -32, spin: -220, art: 6 },
  { left: 64, size: 27, delay: 8, duration: 80, sway: 46, spin: 240, art: 1 },
  { left: 71, size: 19, delay: 49, duration: 108, sway: -26, spin: -260, art: 4 },
  { left: 78, size: 31, delay: 24, duration: 64, sway: 34, spin: 320, art: 7 },
  { left: 85, size: 20, delay: 61, duration: 100, sway: -40, spin: -180, art: 2 },
  { left: 91, size: 25, delay: 16, duration: 88, sway: 42, spin: 200, art: 5 },
  { left: 97, size: 17, delay: 41, duration: 116, sway: -30, spin: -300, art: 8 },
] satisfies ReadonlyArray<{
  left: number;
  size: number;
  delay: number;
  duration: number;
  sway: number;
  spin: number;
  art: number;
}>;

type PetalVars = CSSProperties & Record<`--${string}`, string>;

export function Petals({ motion }: { motion: Theme['motion'] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [fall, setFall] = useState<number | null>(null);

  /* The fall distance is the layer's rendered height, which is only known once
     the invitation has laid out — and it changes when the countdown mounts or
     a font swaps, so it is re-measured rather than read once. */
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const measure = () => setFall(el.offsetHeight);
    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  if (motion === 'reduced') return null;

  return (
    <div
      aria-hidden
      className="lin-petals"
      ref={ref}
      role="presentation"
      style={
        fall === null ? undefined : ({ '--lin-petal-fall': `${fall}px` } as PetalVars)
      }
    >
      {PETALS.slice(0, PETAL_COUNT).map((p, i) => {
        const style: PetalVars = {
          '--lin-petal-left': `${p.left}%`,
          '--lin-petal-size': `${p.size}px`,
          '--lin-petal-delay': `-${p.delay}s`,
          '--lin-petal-duration': `${p.duration}s`,
          '--lin-petal-sway': `${p.sway}px`,
          '--lin-petal-spin': `${p.spin}deg`,
          '--lin-petal-art': `url(/invitation/lin/petals/petal-${p.art}.webp)`,
        };

        return <span className="lin-petal" key={i} style={style} />;
      })}
    </div>
  );
}
