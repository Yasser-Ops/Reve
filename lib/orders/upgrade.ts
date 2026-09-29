import { TIERS, type Tier } from '@/lib/constants';
import { entitlementsForTier } from '@/lib/entitlements';
import type { Entitlements } from '@/lib/schemas/invitation';

const RANK: Record<Tier, number> = {
  [TIERS.BASIC]: 0,
  [TIERS.MANAGED]: 1,
  [TIERS.CUSTOM]: 2,
};

export function upgradeTargets(current: Tier): Tier[] {
  return Object.values(TIERS).filter((tier) => RANK[tier] > RANK[current]);
}

/**
 * The one deliberate exception to "entitlements are a snapshot": a paid
 * upgrade re-resolves them, so Managed's RSVP switches on for an existing
 * Basic invitation. Downgrades do not exist.
 */
export function planUpgrade(
  current: Tier,
  target: Tier,
): { tier: Tier; entitlements: Entitlements } | null {
  if (RANK[target] <= RANK[current]) return null;
  return { tier: target, entitlements: entitlementsForTier(target) };
}
