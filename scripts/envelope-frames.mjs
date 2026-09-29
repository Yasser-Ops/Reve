/**
 * Turns a Blender render into a shippable envelope sequence.
 *
 * THE RENDER IS NOT THE SEQUENCE. Blender writes one PNG per frame at full
 * depth, including a stretch where nothing moves; the browser wants WebP and
 * wants no frame it does not need. This script is the step between: it drops
 * the still frames, converts the rest, and renumbers them contiguously so the
 * player's 1..count indexing still holds.
 *
 * DEDUPLICATION IS THE POINT. A pause between the flap opening and the
 * envelope leaving is, in frames, the same image many times over. Rendering
 * it is wasted GPU time and shipping it is wasted bytes, so the pause is
 * rendered once and held by the player instead — see `holdFrame` in the
 * report this prints, which is the index the caller pins a pause on.
 *
 * Usage:
 *   node scripts/envelope-frames.mjs <srcDir> <outDir> [--threshold=N]
 *
 * `threshold` is the PERCENTAGE OF PIXELS that must change for a frame to be
 * worth shipping. 0.05 means a frame is kept if it differs from the one
 * before it in more than one pixel in two thousand — low enough to keep the
 * last frames of an envelope sliding out of shot, where only a sliver of
 * paper is still moving, and high enough to drop a genuinely static hold.
 */

import { readdir, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';

const [, , SRC, OUT, ...rest] = process.argv;

if (!SRC || !OUT) {
  console.error(
    'usage: node scripts/envelope-frames.mjs <srcDir> <outDir> [--threshold=N]',
  );
  process.exit(1);
}

const threshold = Number(
  rest.find((a) => a.startsWith('--threshold='))?.split('=')[1] ?? 0.05,
);

/**
 * WebP quality.
 *
 * 75 rather than a higher number, because the curve elbows there and the
 * frames are large in aggregate: on Dentelle's damask paper — high-frequency
 * grain, the hardest thing here to compress — 82 costs 48KB a frame against
 * 75's 28KB, and the two are indistinguishable at render scale on the
 * details that would go first (the seal's pressed wreath, the lace threads,
 * the paper tooth). Below 70 the return flattens out, so there is nothing to
 * buy by going lower either.
 *
 * A sequence is downloaded in full before the seal goes live, so per-frame
 * bytes multiply by the frame count and land on the guest as wait.
 */
const QUALITY = 75;

/**
 * How much two frames differ, as the PERCENTAGE OF PIXELS that changed.
 *
 * NOT a mean over the whole frame, which is the metric this started with and
 * which quietly deleted the end of a sequence. Averaging spreads a real
 * change across every pixel that did not change: by the time an envelope is
 * most of the way out of frame, the few hundred pixels of paper still moving
 * are a rounding error against 1.4 million, so consecutive frames scored
 * under the threshold and were dropped as duplicates. The envelope then
 * appeared to stop mid-exit, because the frames that finished the exit were
 * the ones discarded.
 *
 * Counting changed pixels instead is scale-free: a sliver of paper moving
 * against transparency registers as the fraction of the frame it actually
 * occupies, whether or not the rest of the frame is empty.
 *
 * Alpha is compared alongside colour, so a frame that moved without changing
 * any visible colour still counts as different.
 */
function changedFraction(a, b) {
  /* Per-channel tolerance, 0-255. Absorbs encoder noise between two renders
     of the same scene without absorbing a pixel that genuinely moved. */
  const EPSILON = 3;
  let changed = 0;

  for (let i = 0; i < a.length; i += 4) {
    if (
      Math.abs(a[i] - b[i]) > EPSILON ||
      Math.abs(a[i + 1] - b[i + 1]) > EPSILON ||
      Math.abs(a[i + 2] - b[i + 2]) > EPSILON ||
      Math.abs(a[i + 3] - b[i + 3]) > EPSILON
    ) {
      changed += 1;
    }
  }

  return (changed / (a.length / 4)) * 100;
}

const files = (await readdir(SRC))
  .filter((f) => /\.(png|exr)$/i.test(f))
  .sort();

if (files.length === 0) {
  console.error(`no frames found in ${SRC}`);
  process.exit(1);
}

await mkdir(OUT, { recursive: true });

const kept = [];
const dropped = [];
let prev = null;
let prevSrc = null;

for (const file of files) {
  const src = join(SRC, file);
  const { data, info } = await sharp(src)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  if (prev) {
    const d = changedFraction(prev, data);
    if (d < threshold) {
      dropped.push({ file, diff: Number(d.toFixed(3)), sameAs: prevSrc });
      continue;
    }
  }

  kept.push(src);
  prev = data;
  prevSrc = file;
  if (!globalThis.__dims) globalThis.__dims = [info.width, info.height];
}

/* Renumber contiguously: the player indexes 1..count with no gaps, so a
   dropped frame must not leave a hole in the numbering. */
let written = 0;
for (const [i, src] of kept.entries()) {
  const name = `${String(i + 1).padStart(4, '0')}.webp`;
  await sharp(src)
    .webp({ quality: QUALITY, effort: 6 })
    .toFile(join(OUT, name));
  written += 1;
}

const [width, height] = globalThis.__dims ?? [0, 0];

/* Where the dropped frames clustered: the longest run of consecutive drops
   is the pause, and the kept frame just before it is the one to hold. */
let longestRun = 0;
let runStart = null;
let cur = 0;
let curStart = null;
for (const [i, file] of files.entries()) {
  if (dropped.some((d) => d.file === file)) {
    if (cur === 0) curStart = i;
    cur += 1;
    if (cur > longestRun) {
      longestRun = cur;
      runStart = curStart;
    }
  } else {
    cur = 0;
  }
}

const report = {
  source: SRC,
  out: OUT,
  width,
  height,
  rendered: files.length,
  shipped: written,
  droppedCount: dropped.length,
  threshold,
  /* 1-indexed against the SHIPPED sequence: the frame a pause holds on. */
  holdFrame:
    runStart === null
      ? null
      : kept.findIndex((k) => k.endsWith(files[runStart - 1] ?? '')) + 1,
  longestStillRun: longestRun,
};

/*
 * The report is BUILD METADATA, not an asset.
 *
 * It used to land beside the frames, which put it under `public/` and shipped
 * it to every visitor — a few hundred bytes nobody requests, describing how
 * the sequence was cut. It belongs where build output goes instead, and it is
 * worth keeping rather than dropping: reading the drop list is how the
 * dedupe metric was caught deleting the end of a sequence, and it is what
 * maps a Blender frame index onto the shipped numbering the player uses.
 */
const reportDir = join(process.cwd(), '.frames');
await mkdir(reportDir, { recursive: true });
await writeFile(
  join(reportDir, `${OUT.split(/[\\/]/).filter(Boolean).at(-2) ?? 'frames'}.json`),
  JSON.stringify({ ...report, dropped }, null, 2),
);

console.log(JSON.stringify(report, null, 2));
