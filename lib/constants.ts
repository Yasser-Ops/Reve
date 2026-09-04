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
