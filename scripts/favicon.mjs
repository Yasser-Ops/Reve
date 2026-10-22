/**
 * Builds the site icons from the brand logo (assets/brand/reve-logo.jpeg).
 *
 * The logo carries the full "RÊVE / DIGITAL INVITATIONS" lockup, which is an
 * illegible smudge at tab size, so only the R monogram in its circle is used.
 * Writes the Next.js file-convention icons:
 *   app/favicon.ico     16, 32, 48 (PNG-in-ICO)
 *   app/icon.png        512, for browsers and Android
 *   app/apple-icon.png  180, for iOS home screens
 *
 * Run: node scripts/favicon.mjs
 */
import fs from 'node:fs';
import sharp from 'sharp';

const SOURCE = 'assets/brand/reve-logo.jpeg';

/* The monogram's box in the 1254px source, stopping above the Ê's accent. */
const MONOGRAM = { left: 345, top: 150, width: 560, height: 505 };

const corner = await sharp(SOURCE).extract({ left: 0, top: 0, width: 1, height: 1 }).raw().toBuffer();
const background = { r: corner[0], g: corner[1], b: corner[2], alpha: 1 };

/* Square it with the paper colour, so the circle sits centred. */
const pad = MONOGRAM.width - MONOGRAM.height;
const square = await sharp(SOURCE)
  .extract(MONOGRAM)
  .extend({ top: Math.floor(pad / 2), bottom: Math.ceil(pad / 2), background })
  .toBuffer();

/* RGBA: Next (image-rs) rejects an ICO whose PNG entries lack alpha. */
const png = (size) => sharp(square).resize(size).ensureAlpha().png().toBuffer();

fs.writeFileSync('app/icon.png', await png(512));
fs.writeFileSync('app/apple-icon.png', await png(180));

/* ICO with PNG entries: a 6-byte header, a 16-byte directory entry per image,
   then the images. Every browser that reads .ico accepts PNG payloads. */
const sizes = [16, 32, 48];
const images = await Promise.all(sizes.map(png));
const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(sizes.length, 4);
let offset = 6 + 16 * sizes.length;
const entries = sizes.map((size, i) => {
  const entry = Buffer.alloc(16);
  entry.writeUInt8(size, 0);
  entry.writeUInt8(size, 1);
  entry.writeUInt16LE(1, 4);
  entry.writeUInt16LE(32, 6);
  entry.writeUInt32LE(images[i].length, 8);
  entry.writeUInt32LE(offset, 12);
  offset += images[i].length;
  return entry;
});
fs.writeFileSync('app/favicon.ico', Buffer.concat([header, ...entries, ...images]));

console.log('icons written');
