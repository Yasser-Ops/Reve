import { describe, expect, it } from 'vitest';
import {
  DEFAULT_ENVELOPE,
  frameAspect,
  frameSources,
  frameSrc,
  getEnvelope,
  openingDurationMs,
} from '@/lib/envelopes';

describe('getEnvelope', () => {
  it('falls back to the house design for an unknown slug', () => {
    expect(getEnvelope('no-such-envelope').slug).toBe(DEFAULT_ENVELOPE);
  });

  it('falls back when an invitation names no envelope', () => {
    expect(getEnvelope(undefined).slug).toBe(DEFAULT_ENVELOPE);
  });
});

describe('frameSrc', () => {
  const frames = { dir: '/envelope/x/frames', count: 12, pad: 4, fps: 30, width: 800, height: 1732 };

  /* Numbered from 1 to match the render's own output, not from 0. */
  it('numbers frames from one', () => {
    expect(frameSrc(frames, 1)).toBe('/envelope/x/frames/0001.webp');
  });

  /* Padding is explicit because a sequence crossing a power of ten reorders
     under lexical sort otherwise — 10 sorting before 2. */
  it('zero-pads to the declared width', () => {
    expect(frameSrc(frames, 12)).toBe('/envelope/x/frames/0012.webp');
  });
});

describe('frameSources', () => {
  const frames = { dir: '/f', count: 3, pad: 2, fps: 30, width: 800, height: 1732 };

  it('lists every frame in order, sealed first', () => {
    expect(frameSources(frames)).toEqual([
      '/f/01.webp',
      '/f/02.webp',
      '/f/03.webp',
    ]);
  });
});

describe('openingDurationMs', () => {
  it('derives the ceremony length from the render, not a constant', () => {
    expect(openingDurationMs({ dir: '/f', count: 60, pad: 4, fps: 30, width: 800, height: 1732 })).toBe(2000);
  });

  /* A sequence still being rendered can be a single sealed frame — 33ms of
     animation. Without a floor the invitation would appear instantly, as
     though the envelope had never been there. */
  it('holds a barely-rendered sequence long enough to read as a ceremony', () => {
    expect(
      openingDurationMs({ dir: '/f', count: 1, pad: 4, fps: 30, width: 800, height: 1732 }),
    ).toBeGreaterThanOrEqual(1000);
  });
});

describe('frameAspect', () => {
  /* The demo screen takes its shape from here. A box of a different shape
     crops the envelope's top and foot off under `object-fit: cover`. */
  it('reports the render’s own shape', () => {
    expect(
      frameAspect({ dir: '/f', count: 1, pad: 4, fps: 30, width: 800, height: 1732 }),
    ).toBe('800 / 1732');
  });
});
