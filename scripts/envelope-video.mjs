/**
 * Encodes an envelope's shipped frames into one MP4 the player can draw with
 * transparency.
 *
 * WHY A VIDEO. 148 WebP frames are 2.4-3.6 MB and the seal cannot go live
 * until all of them arrive; on a phone over 4G that was eighteen seconds of a
 * dead seal. One H.264 file of the same frames is about a quarter of that,
 * and phones decode it in hardware.
 *
 * WHY STACKED. From the moment the envelope starts to leave, the frames are
 * transparent: the invitation shows through. H.264 has no alpha channel and
 * Safari plays no video format that does without a Mac to encode it, so the
 * alpha travels as a second picture: colour on top, alpha as grey below, one
 * frame twice as tall. The player recombines the halves in a shader
 * (components/invitation/EnvelopeVideo.tsx).
 *
 * The colour half is PREMULTIPLIED over black, which is what the player's
 * canvas composites, and it lets fully transparent pixels compress to nothing.
 *
 * TIMING IS BAKED IN from lib/envelopes.ts, the same spec the frame player
 * reads: each frame lasts 1/fps, or 1/tail.fps from `tail.from` on. The file
 * is variable frame rate, so a two-rate opening needs no duplicated frames.
 *
 * Run: pnpm envelope:video <slug>
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdtemp, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import sharp from 'sharp';
import { ENVELOPES, frameSrc } from '../lib/envelopes.ts';

const ROOT = resolve(import.meta.dirname, '..');

/*
 * 24 keeps the linen's weave and the wax's pressing, checked frame against
 * frame; 20 is twice the size for no visible gain. BT.709 is declared
 * explicitly: browsers assume it for video this tall, and an untagged
 * BT.601 encode shifts every colour against the poster frame it replaces.
 */
const CRF = 24;

/** Ticks per second: divisible by every rate a spec uses (24, 25, 30, 60). */
const TIMESCALE = 1200;

const slug = process.argv[2];
const spec = slug ? ENVELOPES[slug] : undefined;

if (!spec) {
  console.error(
    `usage: node scripts/envelope-video.mjs <slug>  (one of: ${Object.keys(ENVELOPES).join(', ')})`,
  );
  process.exit(1);
}

const { frames } = spec;

if (!spec.video) {
  console.error(`${slug} declares no \`video\` path in lib/envelopes.ts`);
  process.exit(1);
}

/*
 * DECODED BY SHARP, NOT BY FFMPEG. ffmpeg's own WebP decoder lands about 1.5
 * levels darker than libwebp, which is what browsers use for the poster frame,
 * so the envelope visibly dimmed the instant the poster gave way to the video.
 * Going through lossless PNG keeps the encode within a level of the poster.
 */
const work = await mkdtemp(join(tmpdir(), `envelope-${slug}-`));

for (let index = 1; index <= frames.count; index += 1) {
  const path = join(ROOT, 'public', frameSrc(frames, index));
  if (!existsSync(path)) throw new Error(`frame missing: ${path}`);
  await sharp(path)
    .ensureAlpha()
    .png({ compressionLevel: 1 })
    .toFile(join(work, `${String(index).padStart(frames.pad, '0')}.png`));
}

/*
 * Each frame's presentation time, as an ffmpeg expression. It must agree
 * with `frameAt` in lib/envelopes.ts: frames before `tail.from` at `fps`, the
 * rest at `tail.fps`.
 *
 * The index is recovered from the input timestamp, NOT from setpts' frame
 * counter N. The first frames are opaque and the rest carry alpha, so ffmpeg
 * rebuilds the filter graph where the pixel format changes, and N restarts
 * at zero there. The demuxer's timestamp (index / fps) runs straight through.
 */
const head = frames.tail ? frames.tail.from - 1 : frames.count;
const tailFps = frames.tail?.fps ?? frames.fps;
const index = `round(PTS*TB*${frames.fps})`;
const pts = `round((if(lt(${index},${head}),${index}/${frames.fps},${head}/${frames.fps}+(${index}-${head})/${tailFps}))/TB)`;

const pattern = join(work, `%0${frames.pad}d.png`);

try {
  const out = join(ROOT, 'public', spec.video);
  const color = 'out_color_matrix=bt709:out_range=tv';
  const result = spawnSync(
    'ffmpeg',
    [
      '-v', 'error', '-y',
      '-framerate', String(frames.fps), '-i', pattern,
      '-filter_complex',
      [
        /* settb first: 1/1200 holds both 1/30 and 1/24 exactly, where the
           input's own 1/fps clock rounds the tail's times onto each other. */
        `[0:v]settb=1/${TIMESCALE},setpts='${pts}',format=rgba,split[c][a]`,
        '[c]premultiply=inplace=1,format=rgb24[colour]',
        '[a]alphaextract,format=gray,format=rgb24[alpha]',
        `[colour][alpha]vstack,scale=${color},format=yuv420p`,
      ].join(';'),
      '-fps_mode', 'passthrough',
      /* The encoder otherwise keeps the input's 1/fps clock and snaps the
         tail's 1/24 steps onto a 1/30 grid. */
      '-enc_time_base', `1/${TIMESCALE}`,
      '-video_track_timescale', String(TIMESCALE),
      '-c:v', 'libx264', '-profile:v', 'high', '-preset', 'slow', '-crf', String(CRF),
      '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709',
      '-movflags', '+faststart', '-an',
      out,
    ],
    { stdio: 'inherit' },
  );
  if (result.status !== 0) throw new Error(`ffmpeg exited with ${result.status}`);

  const { size } = await stat(out);
  console.log(`${slug}: ${spec.video}, ${Math.round(size / 1024)}kb`);
} finally {
  await rm(work, { recursive: true, force: true });
}
