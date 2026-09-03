import { TIERS, type Tier } from '@/lib/constants';
import { entitlementsSchema, type Entitlements } from '@/lib/schemas/invitation';

/**
 * What each tier includes. The single source of truth for tier capabilities.
 *
 * Resolved once at provisioning time and snapshotted onto the invitation row,
 * so changing a tier's definition never alters what an existing customer
 * already bought.
 */
const BY_TIER: Record<Tier, Entitlements> = {
  [TIERS.BASIC]: { rsvp: false, portal: false, gallery: true },
  [TIERS.MANAGED]: { rsvp: true, portal: true, gallery: true },
  [TIERS.CUSTOM]: { rsvp: true, portal: true, gallery: true },
};

export function entitlementsForTier(tier: Tier): Entitlements {
  return entitlementsSchema.parse(BY_TIER[tier]);
}
