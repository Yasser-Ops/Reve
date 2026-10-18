import { describe, expect, it } from 'vitest';
import { defaultPreviewView, parsePreviewView } from '@/lib/portal/preview-view';

describe('parsePreviewView', () => {
  it.each(['phone', 'full'] as const)('accepts %s', (view) => {
    expect(parsePreviewView(view)).toBe(view);
  });

  it.each([undefined, '', 'Phone', 'sideways', ['phone', 'full'], 1])(
    'returns null for %j, so the viewport default applies',
    (raw) => {
      expect(parsePreviewView(raw)).toBeNull();
    },
  );
});

describe('defaultPreviewView', () => {
  it('opens in the phone wider than a phone, and full screen on one', () => {
    expect(defaultPreviewView(true)).toBe('phone');
    expect(defaultPreviewView(false)).toBe('full');
  });
});
