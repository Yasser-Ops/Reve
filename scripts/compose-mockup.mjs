/**
 * Composes a collection card: the design's own stills dropped into the two
 * blank canvases of `public/ads.jpg`.
 *
 * The base is a photograph, so its plaster ground, shadows and bezel
 * highlights are real. No arrangement of flat CSS layers reaches that, and it
 * is the house format for advertising — the collection and an ad are the same
 * picture rather than two things that drift apart.
 *
 * Run: pnpm mockup:compose <slug>
 */
import { existsSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import sharp from 'sharp';

const ROOT = resolve(import.meta.dirname, '..');
const BASE = resolve(ROOT, 'public', 'ads.jpg');

/*
 * The two blank canvases and their cutouts, ALL MEASURED off the base image
 * rather than assumed.
 *
 * THESE ARE CONSTANTS OF `ads.jpg`, NOT SETTINGS. The base photograph is
 * fixed, so the phone's frame, its camera, the paper and the paper's notch
 * never move — and any still handed to this script is cut to them. A new
 * design needs no change here: it is the stills that vary, never the frame.
 *
 * They are, however, constants of THIS photograph. Reshoot the base and every
 * number below is wrong, silently — the failure looks like a slightly
 * misfitted edge, not like an error. Re-measure by material rather than by
 * brightness if that day comes (see the note below).
 *
 * Measured by MATERIAL, not brightness: the screen is pure neutral white
 * (255,255,255) against a dark bezel, and the paper is neutral against warm
 * plaster. Hunting "bright pixels" instead finds the lit background and
 * overshoots the canvas by several pixels on every side, which is visible as
 * a misfitted edge.
 *
 * The corner radii are FITTED, not guessed: the inset profile down a corner
 * is a circular arc, and least-squares over the first 160 rows gives 76 and
 * 45 to sub-pixel error. Assumed values of 58 and 38 squared the stills off
 * over the curves.
 *
 * Each canvas carries a `hole`: the phone's front camera, and the paper's
 * die-cut notch echoing it. Both are in canvas-relative pixels. The still is
 * PUNCHED at the hole rather than painted over, so what shows through is the
 * photograph's own pixels — the real lens, and the real cut edge in the paper.
 * Drawing them instead would mean inventing a lens and a paper edge, flat, on
 * top of a photograph.
 */
const CANVASES = {
  phone: {
    x: 242,
    y: 316,
    width: 652,
    height: 1398,
    /*
     * FITTED to the corner, not guessed. The inset profile down the top-left
     * corner is a circular arc, and a least-squares fit over the first 160
     * rows gives 76 with sub-pixel error. The 58 that stood here squared the
     * still off over the bezel's curve — visible as a hard corner sitting
     * proud of the phone.
     */
    radius: 76,
    hole: { x: 233, y: 15, width: 188, height: 56, radius: 28 },
  },
  paper: {
    x: 1112,
    y: 317,
    width: 647,
    height: 1395,
    /* Fitted the same way: 45, against the 38 that was assumed. */
    radius: 45,
    /*
     * The paper's edge is SOFT — it shades from its own shadow up to full
     * brightness over one or two pixels rather than cutting sharply. A still
     * sized to where the paper is fully bright leaves that rim showing as a
     * pale strip down the side, so the still is grown by `bleed` to run
     * underneath it.
     *
     * TWO, measured off the edge profile — not more. A larger bleed paints
     * past the paper onto the plaster, which a dark invitation hides and a
     * light one does not. The phone needs none: its bezel is a hard edge.
     */
    bleed: 2,
    hole: { x: 228, y: 11, width: 187, height: 57, radius: 29 },
  },
};

/**
 * The finished crop: the base square, trimmed only of its outermost margin.
 *
 * The margin that remains is not dead space. The light falls from the upper
 * right, so the phone's shadow lies left and below it, and the plaster around
 * the objects is what makes the card read as a photograph rather than as two
 * cutouts on a panel.
 *
 * `components/store/TemplateCard.tsx` declares this same size, because
 * next/image needs intrinsic dimensions for a runtime src. Change it here and
 * that constant must change with it.
 */
const CROP = { left: 24, top: 24, width: 2000, height: 2000 };

/** A rounded-rectangle path, for the canvas outline and for its hole. */
function roundedRect({ x = 0, y = 0, width, height, radius }) {
  const r = Math.min(radius, width / 2, height / 2);
  return `M${x + r} ${y}
          h${width - r * 2}
          a${r} ${r} 0 0 1 ${r} ${r}
          v${height - r * 2}
          a${r} ${r} 0 0 1 ${-r} ${r}
          h${-(width - r * 2)}
          a${r} ${r} 0 0 1 ${-r} ${-r}
          v${-(height - r * 2)}
          a${r} ${r} 0 0 1 ${r} ${-r}
          Z`;
}

/**
 * Fits a still to a canvas, rounds its corners, and punches its hole.
 *
 * Scaled to the canvas WIDTH and cropped from the top, never `cover`. A still
 * is a screenshot of a page laid out at a real phone width, so its full width
 * is the measure the design was drawn against: cropping the sides cuts lines
 * of the couple's message mid-word. Cropping the bottom only ends the page
 * early, which is what a phone screen does anyway. Never stretched — a
 * stretched invitation misreports the proportions a guest will actually see.
 */
async function fit(source, canvas) {
  const bleed = canvas.bleed ?? 0;
  const width = canvas.width + bleed * 2;
  const height = canvas.height + bleed * 2;

  /* Two passes: scale to width, then take the top of that. One chained
     resize() would not do this — the second call replaces the first. */
  const toWidth = await sharp(source).resize({ width }).toBuffer();

  const resized = await sharp(toWidth)
    .resize(width, height, { fit: 'cover', position: 'top' })
    .toBuffer();

  /*
   * ONE path, two subpaths, `fill-rule="evenodd"`: the outer rounded rect
   * keeps, the inner hole drops out. Compositing a black shape afterwards
   * would not work — `dest-in` reads ALPHA, not darkness, so the still has to
   * become genuinely transparent there.
   */
  const mask = Buffer.from(
    `<svg width="${width}" height="${height}">
       <path fill="#fff" fill-rule="evenodd" d="
         ${roundedRect({ width, height, radius: canvas.radius + bleed })}
         ${canvas.hole ? roundedRect({ ...canvas.hole, x: canvas.hole.x + bleed, y: canvas.hole.y + bleed }) : ''}
       "/>
     </svg>`,
  );

  return sharp(resized)
    .composite([{ input: mask, blend: 'dest-in' }])
    .png()
    .toBuffer();
}

async function compose({ phone, paper, out }) {
  for (const [label, path] of Object.entries({ base: BASE, phone, paper })) {
    if (!existsSync(path)) throw new Error(`${label} image missing: ${path}`);
  }

  const [phoneFitted, paperFitted] = await Promise.all([
    fit(phone, CANVASES.phone),
    fit(paper, CANVASES.paper),
  ]);

  await mkdir(dirname(out), { recursive: true });

  const composed = await sharp(BASE)
    .composite([
      {
        input: phoneFitted,
        left: CANVASES.phone.x - (CANVASES.phone.bleed ?? 0),
        top: CANVASES.phone.y - (CANVASES.phone.bleed ?? 0),
      },
      {
        input: paperFitted,
        left: CANVASES.paper.x - (CANVASES.paper.bleed ?? 0),
        top: CANVASES.paper.y - (CANVASES.paper.bleed ?? 0),
      },
    ])
    .toBuffer();

  return sharp(composed).extract(CROP).webp({ quality: 86 }).toFile(out);
}

const slug = process.argv[2];

if (!slug) {
  console.error('usage: node scripts/compose-mockup.mjs <slug>');
  process.exit(1);
}

const dir = resolve(ROOT, 'public', 'collection', slug);
const info = await compose({
  phone: resolve(ROOT, 'public', 'envelope', slug, 'frames', '0001.webp'),
  paper: resolve(dir, 'opened.webp'),
  out: resolve(dir, 'card.webp'),
});

console.log(
  `${slug}: ${info.width}x${info.height}, ${Math.round(info.size / 1024)}kb`,
);
