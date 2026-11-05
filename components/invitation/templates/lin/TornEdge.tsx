/**
 * The torn-paper edge the approved mock puts between bands: a band paints its
 * own ragged top in its own colour, over the band above it, with a pale fibre
 * rim showing just above the tear the way real torn paper does.
 *
 * Drawn, not a raster: it stays crisp at any width and weighs nothing. The
 * outline comes from a seeded generator, so server and client draw the same
 * tear, and each edge on the page gets its own seed so no two match.
 */

const WIDTH = 1000;
const HEIGHT = 30;
/* Where the tear's middle sits inside the strip; jitter goes either way. */
const BASELINE = 16;

/* mulberry32: tiny, deterministic, plenty for an outline. */
function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The tear's outline, as [x, y] points left to right. */
function outline(seed: number): Array<[number, number]> {
  const random = seeded(seed);
  /* A slow swell so the edge wanders, plus fine jitter so it frays. */
  const phase = random() * Math.PI * 2;
  const points: Array<[number, number]> = [];
  for (let x = 0; x <= WIDTH; x += 6 + random() * 14) {
    const swell = Math.sin(x / 140 + phase) * 5 + Math.sin(x / 47 + phase * 2) * 2;
    const fray = (random() - 0.5) * 5;
    points.push([x, BASELINE + swell + fray]);
  }
  points.push([WIDTH, BASELINE]);
  return points;
}

function closedPath(points: ReadonlyArray<readonly [number, number]>, lift: number): string {
  const line = points.map(([x, y]) => `${x.toFixed(1)},${(y - lift).toFixed(1)}`).join(' L');
  return `M0,${HEIGHT} L${line} L${WIDTH},${HEIGHT} Z`;
}

export function TornEdge({ color, seed }: { color: string; seed: number }) {
  const points = outline(seed);

  return (
    <svg
      aria-hidden
      className="pointer-events-none absolute inset-x-0 bottom-full z-[15] block translate-y-px h-7 w-full md:h-9"
      preserveAspectRatio="none"
      style={{ filter: 'drop-shadow(0 -1px 1.5px rgb(0 0 0 / 0.08))' }}
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
    >
      {/* The fibre rim: the same tear lifted a little, in near-white. */}
      <path d={closedPath(points, 2.5)} fill="#fbfbf9" opacity={0.85} />
      <path d={closedPath(points, 0)} fill={color} />
    </svg>
  );
}
