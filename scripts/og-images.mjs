/**
 * Renders the link-preview images WhatsApp, Instagram and search engines show
 * when a Rêve URL is shared.
 *
 *   public/og.jpg                      the site: monogram beside a collection card
 *   public/collection/<slug>/og.jpg    a design page: its own collection card
 *   public/envelope/<slug>/og.jpg      a couple's invitation: the sealed envelope
 *
 * The invitation image is the envelope, never the collection card: the card's
 * paper carries the sample couple's names, and a real couple's link must not
 * preview as someone else's wedding.
 *
 * JPEG, not WebP: link-preview crawlers are the one place WebP is still not
 * reliably read. 1200x630 is the 1.91:1 frame every one of them crops to.
 *
 * Run: pnpm og:images (again after any new collection card or envelope render).
 */
import { existsSync } from 'node:fs';
import { readdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import sharp from 'sharp';

const ROOT = resolve(import.meta.dirname, '..');
const PUBLIC = join(ROOT, 'public');
const WIDTH = 1200;
const HEIGHT = 630;
const QUALITY = 84;
/** The collection card the site-wide image shows beside the monogram. */
const SITE_CARD = 'jardin';
/** The first frame of an envelope's opening is the sealed envelope. */
const SEALED_FRAME = '0001.webp';

const jpeg = (image) => image.jpeg({ quality: QUALITY, mozjpeg: true });

/** The colour of an image's top-left pixel: the ground a card sits on. */
async function groundOf(file) {
  const { data } = await sharp(file).extract({ left: 4, top: 4, width: 1, height: 1 }).raw().toBuffer({ resolveWithObject: true });
  return { r: data[0], g: data[1], b: data[2] };
}

/** A square card, full height, centred on a canvas of its own ground. */
async function cardImage(card, out) {
  const background = await groundOf(card);
  const resized = await sharp(card).resize(HEIGHT, HEIGHT).toBuffer();
  await jpeg(sharp({ create: { width: WIDTH, height: HEIGHT, channels: 3, background } })
    .composite([{ input: resized, left: (WIDTH - HEIGHT) / 2, top: 0 }]))
    .toFile(out);
}

/** The sealed envelope, cropped to the band around its seal. */
async function envelopeImage(frame, out) {
  const { width, height } = await sharp(frame).metadata();
  const bandHeight = Math.round((width * HEIGHT) / WIDTH);
  /* The seal sits a little above the middle of the frame. */
  const top = Math.round(height * 0.45 - bandHeight / 2);
  await jpeg(sharp(frame).extract({ left: 0, top, width, height: bandHeight }).resize(WIDTH, HEIGHT)).toFile(out);
}

/** How far the card fades into the monogram's ground, in pixels. */
const FEATHER = 48;

/**
 * The monogram on the left on its own ground, a collection card on the right.
 * The card is shot on warmer plaster, so a hard edge between them reads as a
 * seam; the card's left edge fades out over FEATHER pixels instead.
 */
async function siteImage(logo, card, out) {
  const background = await groundOf(logo);
  const fade = Buffer.from(
    `<svg width="${HEIGHT}" height="${HEIGHT}"><defs><linearGradient id="f"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="${FEATHER / HEIGHT}" stop-color="#fff" stop-opacity="1"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#f)"/></svg>`,
  );
  const [mark, shown] = await Promise.all([
    sharp(logo).resize(HEIGHT, HEIGHT).toBuffer(),
    sharp(card).resize(HEIGHT, HEIGHT).ensureAlpha().composite([{ input: fade, blend: 'dest-in' }]).png().toBuffer(),
  ]);
  await jpeg(sharp({ create: { width: WIDTH, height: HEIGHT, channels: 3, background } })
    .composite([{ input: mark, left: 0, top: 0 }, { input: shown, left: WIDTH - HEIGHT, top: 0 }]))
    .toFile(out);
}

const slugsIn = async (dir) => (await readdir(join(PUBLIC, dir), { withFileTypes: true })).filter((d) => d.isDirectory()).map((d) => d.name);

for (const slug of await slugsIn('collection')) {
  const card = join(PUBLIC, 'collection', slug, 'card.webp');
  if (!existsSync(card)) continue;
  await cardImage(card, join(PUBLIC, 'collection', slug, 'og.jpg'));
  console.log(`collection/${slug}/og.jpg`);
}

for (const slug of await slugsIn('envelope')) {
  const frame = join(PUBLIC, 'envelope', slug, 'frames', SEALED_FRAME);
  if (!existsSync(frame)) continue;
  await envelopeImage(frame, join(PUBLIC, 'envelope', slug, 'og.jpg'));
  console.log(`envelope/${slug}/og.jpg`);
}

await siteImage(join(ROOT, 'assets', 'brand', 'reve-logo.jpeg'), join(PUBLIC, 'collection', SITE_CARD, 'card.webp'), join(PUBLIC, 'og.jpg'));
console.log('og.jpg');
