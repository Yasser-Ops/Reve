import { describe, expect, it } from 'vitest';
import { SCREEN_HEIGHT, screenFor, screenShare } from '@/components/invitation/screen';

describe('invitation screen height', () => {
  it('falls back to the viewport on a real guest page', () => {
    expect(SCREEN_HEIGHT).toBe('var(--invitation-screen-h, 100dvh)');
  });

  it('declares a scaled container screen in the template\'s own pixels', () => {
    expect(screenFor(430, 9 / 16)).toEqual({ '--invitation-screen-h': `${430 / (9 / 16)}px` });
  });

  it('takes a share of one screen', () => {
    expect(screenShare(0.52)).toBe('calc(var(--invitation-screen-h, 100dvh) * 0.52)');
  });
});
