import { describe, expect, it } from 'vitest';
import { TIERS } from '@/lib/constants';
import { planUpgrade, upgradeTargets } from '@/lib/orders/upgrade';

describe('upgrades', () => {
  it('offers only higher tiers', () => {
    expect(upgradeTargets(TIERS.BASIC)).toEqual([TIERS.MANAGED, TIERS.CUSTOM]);
    expect(upgradeTargets(TIERS.CUSTOM)).toEqual([]);
  });

  it('switches RSVP on when Basic becomes Managed', () => {
    expect(planUpgrade(TIERS.BASIC, TIERS.MANAGED)).toEqual({
      tier: TIERS.MANAGED,
      entitlements: { rsvp: true, portal: true, gallery: true },
    });
  });

  it('refuses a downgrade or a sideways move', () => {
    expect(planUpgrade(TIERS.MANAGED, TIERS.BASIC)).toBeNull();
    expect(planUpgrade(TIERS.MANAGED, TIERS.MANAGED)).toBeNull();
  });
});
