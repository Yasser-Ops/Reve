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

/* Hand-spread rather than random: a fresh Math.random() on every render would
   disagree between server and client and throw a hydration mismatch, so the
   values are fixed in the source. */
/* Durations are long because the fall spans the whole document rather than
   one screen: a petal crossing several thousand pixels in twenty seconds reads
   as rain. These are tuned so a petal drifts past at roughly walking pace.
   `flip` is the seconds of one tumble about the vertical axis, which is what
   turns a small sprite from a bubble into a petal. Sprites 1 and 7 are left
   out: nearly circular, they still read as bubbles at this size. */
const PETALS = [
  { left: 1, size: 39, delay: 32, duration: 81, sway: 44, spin: 250, flip: 4.0, art: 2 },
  { left: 7, size: 36, delay: 60, duration: 104, sway: -42, spin: -290, flip: 3.7, art: 4 },
  { left: 9, size: 35, delay: 77, duration: 73, sway: 43, spin: 250, flip: 5.8, art: 5 },
  { left: 14, size: 24, delay: 56, duration: 116, sway: -43, spin: -270, flip: 4.7, art: 2 },
  { left: 19, size: 38, delay: 41, duration: 87, sway: 47, spin: 230, flip: 3.5, art: 5 },
  { left: 21, size: 30, delay: 32, duration: 117, sway: -40, spin: -280, flip: 5.6, art: 8 },
  { left: 24, size: 27, delay: 62, duration: 95, sway: 36, spin: 210, flip: 5.7, art: 3 },
  { left: 28, size: 29, delay: 38, duration: 103, sway: -50, spin: -250, flip: 3.5, art: 6 },
  { left: 32, size: 27, delay: 40, duration: 91, sway: 33, spin: 250, flip: 4.8, art: 6 },
  { left: 36, size: 38, delay: 50, duration: 113, sway: -42, spin: -270, flip: 4.5, art: 4 },
  { left: 40, size: 34, delay: 103, duration: 90, sway: 44, spin: 220, flip: 4.8, art: 3 },
  { left: 44, size: 28, delay: 43, duration: 110, sway: -49, spin: -200, flip: 5.5, art: 2 },
  { left: 47, size: 29, delay: 17, duration: 74, sway: 52, spin: 210, flip: 4.9, art: 5 },
  { left: 51, size: 30, delay: 65, duration: 77, sway: -50, spin: -300, flip: 5.7, art: 8 },
  { left: 57, size: 38, delay: 84, duration: 84, sway: 24, spin: 210, flip: 3.2, art: 3 },
  { left: 58, size: 33, delay: 25, duration: 107, sway: -38, spin: -280, flip: 3.7, art: 6 },
  { left: 65, size: 26, delay: 41, duration: 115, sway: 27, spin: 250, flip: 3.0, art: 8 },
  { left: 69, size: 33, delay: 101, duration: 71, sway: -49, spin: -210, flip: 5.9, art: 4 },
  { left: 71, size: 34, delay: 29, duration: 81, sway: 30, spin: 260, flip: 3.2, art: 8 },
  { left: 76, size: 35, delay: 79, duration: 95, sway: -25, spin: -200, flip: 5.8, art: 2 },
  { left: 78, size: 34, delay: 98, duration: 72, sway: 49, spin: 300, flip: 6.0, art: 5 },
  { left: 84, size: 36, delay: 46, duration: 82, sway: -44, spin: -300, flip: 4.2, art: 8 },
  { left: 86, size: 29, delay: 98, duration: 98, sway: 34, spin: 270, flip: 5.2, art: 3 },
  { left: 90, size: 35, delay: 47, duration: 80, sway: -33, spin: -320, flip: 6.0, art: 6 },
  { left: 95, size: 38, delay: 101, duration: 80, sway: 42, spin: 200, flip: 4.5, art: 4 },
  { left: 98, size: 36, delay: 104, duration: 94, sway: -29, spin: -240, flip: 3.5, art: 4 },
] satisfies ReadonlyArray<{
  left: number;
  size: number;
  delay: number;
  duration: number;
  sway: number;
  spin: number;
  flip: number;
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
      {PETALS.map((p, i) => {
        const style: PetalVars = {
          '--lin-petal-left': `${p.left}%`,
          '--lin-petal-size': `${p.size}px`,
          '--lin-petal-delay': `-${p.delay}s`,
          '--lin-petal-duration': `${p.duration}s`,
          '--lin-petal-sway': `${p.sway}px`,
          '--lin-petal-spin': `${p.spin}deg`,
          '--lin-petal-flip': `${p.flip}s`,
          '--lin-petal-art': `url(/invitation/lin/petals/petal-${p.art}.webp)`,
        };

        return <span className="lin-petal" key={i} style={style} />;
      })}
    </div>
  );
}
