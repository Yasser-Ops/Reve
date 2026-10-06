import { describe, expect, it } from 'vitest';
import { namesMatch } from '@/lib/admin/names';

describe('namesMatch', () => {
  /* Review Focus 1. */
  it('ignores case and surrounding spaces, as the database does', () => {
    expect(namesMatch('  maya HADDAD ', 'Maya Haddad')).toBe(true);
  });

  it('does not match a different or empty name', () => {
    expect(namesMatch('Maya', 'Maya Haddad')).toBe(false);
    expect(namesMatch('', 'Maya Haddad')).toBe(false);
  });
});
