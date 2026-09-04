export const TIERS = {
  BASIC: 'basic',
  MANAGED: 'managed',
  CUSTOM: 'custom',
} as const;

export type Tier = (typeof TIERS)[keyof typeof TIERS];

export const INVITATION_STATUS = {
  DRAFT: 'draft',
  PUBLISHED: 'published',
  ARCHIVED: 'archived',
} as const;

export type InvitationStatus =
  (typeof INVITATION_STATUS)[keyof typeof INVITATION_STATUS];

/**
 * The lowest price any design can be bought at.
 *
 * Every design is available on every tier at the same price, so this is a
 * property of the pricing model rather than of a template. The collection
 * quotes it; the pricing section on the home page is the full table.
 */
export const ENTRY_PRICE = '$50';
