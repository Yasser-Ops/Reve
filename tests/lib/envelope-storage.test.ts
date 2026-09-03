import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { hasOpened, markOpened } from '@/lib/envelope-storage';

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('envelope storage', () => {
  it('reports not opened for an unknown slug', () => {
    expect(hasOpened('sarah-and-amine')).toBe(false);
  });

  it('reports opened after marking', () => {
    markOpened('sarah-and-amine');
    expect(hasOpened('sarah-and-amine')).toBe(true);
  });

  it('tracks each invitation separately', () => {
    markOpened('sarah-and-amine');
    expect(hasOpened('lina-and-karim')).toBe(false);
  });

  it('returns false rather than throwing when storage is unavailable', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('storage disabled');
      },
      setItem: () => {
        throw new Error('storage disabled');
      },
    });

    expect(hasOpened('sarah-and-amine')).toBe(false);
    expect(() => markOpened('sarah-and-amine')).not.toThrow();
  });
});
