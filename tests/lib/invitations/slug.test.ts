import { describe, expect, it } from 'vitest';
import { proposeSlug, slugSchema, withSuffix } from '@/lib/invitations/slug';

describe('slugs', () => {
  it('proposes a link from a name', () => {
    expect(proposeSlug('Maya Haddad')).toBe('maya-haddad');
  });

  it('drops accents and punctuation', () => {
    expect(proposeSlug('  Rêve  & Élie!! ')).toBe('reve-elie');
  });

  /* An Arabic-only name has no Latin letters to keep. */
  it('falls back when nothing Latin survives', () => {
    expect(proposeSlug('مايا')).toBe('invitation');
  });

  /* Review Focus 5. */
  it('numbers a slug that is taken', () => {
    expect(withSuffix('maya-haddad', new Set())).toBe('maya-haddad');
    expect(withSuffix('maya-haddad', new Set(['maya-haddad']))).toBe('maya-haddad-2');
    expect(
      withSuffix('maya-haddad', new Set(['maya-haddad', 'maya-haddad-2'])),
    ).toBe('maya-haddad-3');
  });

  it('accepts only lowercase words joined by single hyphens', () => {
    expect(slugSchema.safeParse('maya-karim').success).toBe(true);
    expect(slugSchema.safeParse('Maya').success).toBe(false);
    expect(slugSchema.safeParse('maya--karim').success).toBe(false);
    expect(slugSchema.safeParse('ab').success).toBe(false);
  });
});
