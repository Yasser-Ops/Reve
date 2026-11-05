import type { CSSProperties } from 'react';

/**
 * A trail of petals resting at a band's edge, as in the approved mock, where
 * loose white petals spill down the margins across the torn seams.
 *
 * Built from Lin's own petal sprites rather than the mock's Canva blossoms,
 * which are licensed for use inside Canva only. Static, so it costs nothing
 * and stays for a reduced-motion reader; the falling layer is the motion.
 *
 * Hand-placed in a 70 x 190 box (px), top to bottom. The right-hand spray is
 * the same trail mirrored, turned a little so the two sides do not read as
 * reflections.
 */
const TRAIL = [
  { x: 0, y: 0, size: 21, rotate: 16, art: 2 },
  { x: 21, y: 11, size: 18, rotate: 168, art: 3 },
  { x: 12, y: 21, size: 14, rotate: 257, art: 4 },
  { x: 5, y: 35, size: 19, rotate: 298, art: 5 },
  { x: 14, y: 43, size: 14, rotate: 265, art: 6 },
  { x: 23, y: 61, size: 23, rotate: 85, art: 8 },
  { x: 17, y: 77, size: 11, rotate: 70, art: 2 },
  { x: 27, y: 88, size: 11, rotate: 138, art: 3 },
  { x: 39, y: 97, size: 12, rotate: 220, art: 4 },
  { x: 44, y: 107, size: 23, rotate: 7, art: 5 },
  { x: 39, y: 126, size: 29, rotate: 103, art: 6 },
  { x: 25, y: 138, size: 23, rotate: 263, art: 8 },
  { x: 52, y: 150, size: 17, rotate: 92, art: 2 },
  { x: 43, y: 151, size: 23, rotate: 299, art: 3 },
  { x: 38, y: 175, size: 11, rotate: 240, art: 4 },
] as const;

export type SpraySide = 'left' | 'right';

export function PetalSpray({ side }: { side: SpraySide }) {
  const box: CSSProperties =
    side === 'left'
      ? { left: 4, transform: 'rotate(-4deg)' }
      : { right: 4, transform: 'scaleX(-1) rotate(-10deg)' };

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute -top-16 z-[16] h-[190px] w-[70px]"
      style={box}
    >
      {TRAIL.map((petal, index) => (
        <span
          className="absolute bg-contain bg-center bg-no-repeat"
          key={index}
          style={{
            left: petal.x,
            top: petal.y,
            width: petal.size,
            height: petal.size,
            transform: `rotate(${petal.rotate}deg)`,
            backgroundImage: `url(/invitation/lin/petals/petal-${petal.art}.webp)`,
            filter: 'drop-shadow(0 1px 1.5px rgb(60 50 35 / 0.28))',
          }}
        />
      ))}
    </div>
  );
}
