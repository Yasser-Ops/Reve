import { describe, expect, it } from 'vitest';
import {
  entitlementsSchema,
  themeSchema,
} from '@/lib/schemas/invitation';

describe('themeSchema', () => {
  it('applies defaults when given an empty object', () => {
    expect(themeSchema.parse({})).toEqual({ palette: 'default', motion: 'full' });
  });

  it('rejects an unknown motion value', () => {
    expect(() => themeSchema.parse({ motion: 'wild' })).toThrow();
  });
});

describe('entitlementsSchema', () => {
  it('defaults every capability to false', () => {
    expect(entitlementsSchema.parse({})).toEqual({
      rsvp: false,
      portal: false,
      gallery: false,
    });
  });

  it('preserves explicitly granted capabilities', () => {
    expect(entitlementsSchema.parse({ rsvp: true, gallery: true })).toEqual({
      rsvp: true,
      portal: false,
      gallery: true,
    });
  });
});
