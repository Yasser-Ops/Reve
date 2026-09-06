/**
 * Cut an envelope's flap and pocket from the photograph of the closed envelope.
 *
 * The shipped bone-vine layers were cut by hand, once, with the seam placed
 * INSIDE the flap: on the left arm the flap's real deckled edge sits ~50px
 * further out than the cut. So a band of flap carrying part of the embossed
 * vine border was assigned to the pocket. Sealed that is invisible, because
 * the two halves reassemble the photograph exactly; it shows only once the
 * flap rotates away and the pocket is seen alone, as cut-off vine leaves
 * clinging to the left of the mouth and nothing on the right.
 *
 * THE CUT ONLY EVER REASSIGNS PIXELS. It never modifies them, so compositing
 * the two pieces returns the source photograph and the sealed envelope cannot
 * be damaged by re-cutting. An earlier attempt blurred the stranded vine off
 * the pocket instead: it fixed the open state and silently wrecked the closed
 * one, because the blurred band lies outside the flap and is visible while
 * sealed. The assertion at the end of this script is what makes that class of
 * mistake impossible to commit.
 *
 * The seam follows the flap's own deckle rather than a straight line. A
 * straight V was close, but paper does not have straight edges, and the
 * difference is visible along the mouth once the envelope is open. Edge
 * detection alone does NOT work here — run over a wide window it locks onto
 * the vine's relief, which is a stronger gradient than the paper edge, and
 * returns a seam through the middle of the ornament. It only works inside a
 * narrow corridor around a hand-verified V, where the vine is out of reach.
 *
 * Run: node scripts/cut-envelope.mjs [--dry]
 */

import sharp from 'sharp';
import fs from 'node:fs/promises';
import path from 'node:path';

const DIR = 'public/envelope';
const OUT = `${DIR}/bone-vine`;
const DRY = process.argv.includes('--dry');

/**
 * The flap's outer edge, placed by eye against the photograph and checked by
 * drawing it back over the image. Fractions of the frame.
 *
 * This is only a guide rail: the real seam is snapped to the paper edge within
 * CORRIDOR px of these lines. Measured by hand because detection cannot find
 * this edge unaided — see the header.
 */
const V = {
  apex: [0.497, 0.834],
  shoulderL: [0.008, 0.0],
  shoulderR: [0.995, 0.0],
};

/** How far either side of the guide rail to look for the true paper edge.
 *  Must stay well inside the vine, which begins ~30px further in. */
const CORRIDOR = 13;

/** Minimum luma step, on 0-255, for a candidate to count as the paper edge. */
const MIN_STEP = 6;

const readRGBA = async (file) => {
  const img = sharp(await fs.readFile(file)).ensureAlpha();
  const { width, height } = await img.metadata();
  return { width, height, data: await img.raw().toBuffer() };
};

const src = await readRGBA(`${OUT}/source-closed.png`);
const { width: W, height: H } = src;

/* Blurred luma, so the search sees the edge's shadow and not paper grain. */
const luma = await sharp(await fs.readFile(`${OUT}/source-closed.png`))
  .removeAlpha()
  .blur(2)
  .greyscale()
  .raw()
  .toBuffer();
const L = (x, y) => luma[y * W + x];

const [ax, ay] = [V.apex[0] * W, V.apex[1] * H];
const [lx, ly] = [V.shoulderL[0] * W, V.shoulderL[1] * H];
const [rx, ry] = [V.shoulderR[0] * W, V.shoulderR[1] * H];

/** x of the guide rail at row y, for each arm. */
const railL = (y) => lx + ((ax - lx) * (y - ly)) / (ay - ly);
const railR = (y) => rx + ((ax - rx) * (y - ry)) / (ay - ry);

/**
 * Snap to the paper edge: the flap sits on top and casts a shadow, so crossing
 * outward the luma steps DOWN. Signed, so the ornament's bright relief — which
 * steps the other way — cannot win.
 */
function snap(rail, y, outward) {
  const base = rail(y);
  let best = 0;
  let bestX = base;
  for (let d = -CORRIDOR; d <= CORRIDOR; d++) {
    const x = Math.round(base + d);
    if (x < 3 || x > W - 4) continue;
    const step = L(x - 3 * outward, y) - L(x + 3 * outward, y);
    if (step > best) {
      best = step;
      bestX = x;
    }
  }
  /* Near the top of the frame the flap's edge runs close to the envelope's own
     outer edge, and the snap flips between the two — a sawtooth several px
     wide. Where the step is weak, trust the hand-placed rail instead: a guide
     rail that is slightly off beats an edge that is confidently wrong. */
  return best < MIN_STEP ? base : bestX;
}

const apexRow = Math.round(ay);
const edgeL = new Float64Array(apexRow + 1);
const edgeR = new Float64Array(apexRow + 1);
for (let y = 0; y <= apexRow; y++) {
  edgeL[y] = snap(railL, y, -1);
  edgeR[y] = snap(railR, y, +1);
}

/* Median-then-mean smoothing. The median rejects rows where the snap latched
   onto a speck of grain; the mean removes the remaining stair-stepping so the
   deckle reads as paper rather than as noise.
 *
 * The windows are wide on purpose. Narrower ones tracked the edge too
 * literally and produced a serrated, torn-looking mouth — a real deckle waves
 * over tens of pixels, it does not zigzag every few rows. */
function smooth(edge) {
  const n = edge.length;
  const med = new Float64Array(n);
  const R = 17;
  for (let i = 0; i < n; i++) {
    const w = [];
    for (let k = -R; k <= R; k++) w.push(edge[Math.min(n - 1, Math.max(0, i + k))]);
    w.sort((a, b) => a - b);
    med[i] = w[(w.length / 2) | 0];
  }
  const out = new Float64Array(n);
  const S = 13;
  for (let i = 0; i < n; i++) {
    let s = 0;
    let c = 0;
    for (let k = -S; k <= S; k++) {
      const j = i + k;
      if (j < 0 || j >= n) continue;
      s += med[j];
      c++;
    }
    out[i] = s / c;
  }
  return out;
}

const sL = smooth(edgeL);
const sR = smooth(edgeR);

/* Converge the last few rows onto the tip, so the two edges meet in a point
   instead of crossing over and leaving a notch. */
const TAPER = 26;
for (let i = 0; i < TAPER; i++) {
  const y = apexRow - i;
  const t = i / TAPER;
  sL[y] = sL[y] * t + ax * (1 - t);
  sR[y] = sR[y] * t + ax * (1 - t);
}

/** Coverage of the flap at (x,y), antialiased across one pixel. */
function cover(x, y) {
  if (y > apexRow) return 0;
  const a = Math.min(1, Math.max(0, x - sL[y] + 0.5));
  const b = Math.min(1, Math.max(0, sR[y] - x + 0.5));
  return Math.min(a, b);
}

const mask = new Uint8Array(W * H);
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) mask[y * W + x] = Math.round(cover(x, y) * 255);
}

const applyMask = (rgba, invert) => {
  const out = Buffer.from(rgba);
  for (let i = 0; i < mask.length; i++) {
    out[i * 4 + 3] = Math.min(out[i * 4 + 3], invert ? 255 - mask[i] : mask[i]);
  }
  return out;
};

const flap = applyMask(src.data, false);
const pocket = applyMask(src.data, true);

/*
 * The back of the flap, from the photograph of the envelope standing open.
 *
 * Flipped vertically and not horizontally: the hinge rotates about the X axis
 * and the back face carries `rotateX(180deg)`, so two near-opposite vertical
 * flips compose to the identity and the stored image must sit exactly where
 * the front does. The shipped flap-inner was flopped HORIZONTALLY, which threw
 * the flap 7.3% of the envelope's width sideways the moment the hinge passed
 * vertical. Taking its alpha from the flap makes the two faces register by
 * construction, so that cannot recur.
 */
const backRaw = await sharp(await fs.readFile(`${OUT}/source-open.webp`))
  .ensureAlpha()
  .flip()
  .raw()
  .toBuffer();
const flapInner = Buffer.from(backRaw);
for (let i = 0; i < mask.length; i++) flapInner[i * 4 + 3] = mask[i];

/* Sealed integrity. The pieces are complements of an unmodified photograph, so
   compositing them must return it. Anything else means pixels were altered and
   the closed envelope is damaged. */
let worst = 0;
for (let i = 0; i < mask.length; i++) {
  const m = mask[i] / 255;
  for (let c = 0; c < 3; c++) {
    const back = src.data[i * 4 + c];
    const recomposed = flap[i * 4 + c] * m + back * (1 - m);
    worst = Math.max(worst, Math.abs(recomposed - src.data[i * 4 + c]));
  }
}
if (worst > 1) {
  console.error(`reassembly check FAILED: worst channel error ${worst.toFixed(2)}`);
  process.exit(1);
}

/* Re-measure what the registry has to agree with. */
let lowest = -1;
let lowXs = [];
let top = -1;
for (let y = 0; y < H; y++) {
  const xs = [];
  for (let x = 0; x < W; x++) if (mask[y * W + x] > 16) xs.push(x);
  if (xs.length) {
    if (top < 0) top = y;
    lowest = y;
    lowXs = xs;
  }
}
console.log(`reassembly ok (worst channel error ${worst.toFixed(2)})`);
console.log(`  sealY: '${((lowest / H) * 100).toFixed(1)}%'`);
console.log(`  sealX: '${(((lowXs[0] + lowXs.at(-1)) / 2 / W) * 100).toFixed(1)}%'`);
console.log(`  flapTop: '${((top / H) * 100).toFixed(1)}%'`);

if (DRY) {
  /* Draw the seam over the photograph. Placement can only be judged by eye —
     the assertion above proves the pieces fit, never that they fit in the
     right place, because ANY seam reassembles perfectly. */
  const view = Buffer.from(src.data);
  for (let y = 0; y <= apexRow; y++) {
    for (const e of [sL[y], sR[y]]) {
      const x = Math.round(e);
      if (x < 0 || x >= W) continue;
      const p = (y * W + x) * 4;
      view[p] = 255;
      view[p + 1] = 0;
      view[p + 2] = 0;
    }
  }
  await sharp(view, { raw: { width: W, height: H, channels: 4 } })
    .png()
    .toFile(process.argv[process.argv.indexOf('--dry') + 1] ?? 'seam.png');
  console.log('dry run — seam overlay written, nothing else changed');
} else {
  const write = async (name, buf) => {
    const dest = path.join(OUT, name);
    const tmp = `${dest}.tmp`;
    await sharp(buf, { raw: { width: W, height: H, channels: 4 } })
      .webp({ quality: 92 })
      .toFile(tmp);
    await fs.rename(tmp, dest);
  };
  await write('flap.webp', flap);
  await write('pocket.webp', pocket);
  await write('flap-inner.webp', flapInner);
  console.log('wrote flap.webp, pocket.webp, flap-inner.webp');
}
