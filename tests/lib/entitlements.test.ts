import { describe, expect, it } from 'vitest';
import { entitlementsForTier } from '@/lib/entitlements';
import { TIERS } from '@/lib/constants';

describe('entitlementsForTier', () => {
  it('grants basic a gallery but no RSVP and no portal', () => {
    expect(entitlementsForTier(TIERS.BASIC)).toEqual({
      rsvp: false,
      portal: false,
      gallery: true,
    });
  });

  it('grants managed RSVP, portal, and gallery', () => {
    expect(entitlementsForTier(TIERS.MANAGED)).toEqual({
      rsvp: true,
      portal: true,
      gallery: true,
    });
  });

  it('grants custom everything managed receives', () => {
    expect(entitlementsForTier(TIERS.CUSTOM)).toEqual(
      entitlementsForTier(TIERS.MANAGED),
    );
  });
});
