import { describe, expect, it } from 'vitest';
import { MEDIA_KINDS, acceptsType, mediaPath } from '@/lib/admin/media-paths';

const INV = '22222222-2222-4222-8222-222222222222';

describe('media paths', () => {
  it('files an upload under its invitation and kind', () => {
    expect(mediaPath(INV, MEDIA_KINDS.PHOTOS, 'Beach Day.webp')).toBe(`${INV}/photos/beach-day.webp`);
  });

  it('keeps envelope frame numbers', () => {
    expect(mediaPath(INV, MEDIA_KINDS.ENVELOPE, '0042.webp')).toBe(`${INV}/envelope/0042.webp`);
  });

  it('cannot be steered out of its folder', () => {
    expect(mediaPath(INV, MEDIA_KINDS.PHOTOS, '../../other/x.webp')).toBe(
      `${INV}/photos/other-x.webp`,
    );
  });

  it('takes video only for the opening screen', () => {
    expect(acceptsType(MEDIA_KINDS.HERO, 'video/mp4')).toBe(true);
    expect(acceptsType(MEDIA_KINDS.PHOTOS, 'video/mp4')).toBe(false);
    expect(acceptsType(MEDIA_KINDS.PHOTOS, 'image/jpeg')).toBe(false);
  });
});
