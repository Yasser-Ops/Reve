/**
 * Converts raster imagery in public/ to WebP, capped at 1600px wide.
 *
 * Run with `pnpm optimize:images`. Idempotent: a source whose .webp is already
 * newer than it is skipped, so re-running after adding one photograph does not
 * reprocess the whole directory.
 *
 * Sources are left in place. Committing the .webp alongside its original keeps
 * the pipeline reproducible when a cap or quality setting changes later.
 */
import { readdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import sharp from 'sharp';

const PUBLIC_DIR = resolve(import.meta.dirname, '..', 'public');
const MAX_WIDTH = 1600;
const QUALITY = 82;
const SOURCES = new Set(['.png', '.jpg', '.jpeg']);

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(path);
    else yield path;
  }
}

let converted = 0;
let skipped = 0;

for await (const source of walk(PUBLIC_DIR)) {
  if (!SOURCES.has(extname(source).toLowerCase())) continue;

  const target = source.replace(/\.[^.]+$/, '.webp');

  if (existsSync(target)) {
    const [a, b] = await Promise.all([stat(source), stat(target)]);
    if (b.mtimeMs >= a.mtimeMs) {
      skipped += 1;
      continue;
    }
  }

  /* metadata() reports pixel dimensions, not bytes, so the original's weight
     comes from the filesystem. */
  const { width } = await sharp(source).metadata();
  const before = (await stat(source)).size;

  await sharp(source)
    .resize({ width: Math.min(width ?? MAX_WIDTH, MAX_WIDTH), withoutEnlargement: true })
    .webp({ quality: QUALITY })
    .toFile(target);

  const after = (await stat(target)).size;
  const saved = Math.round((1 - after / before) * 100);

  console.log(
    `${source.replace(PUBLIC_DIR, 'public')} -> webp  ${(before / 1024 / 1024).toFixed(2)}MB -> ${(after / 1024).toFixed(0)}KB  (-${saved}%)`,
  );
  converted += 1;
}

console.log(`\n${converted} converted, ${skipped} already current.`);
