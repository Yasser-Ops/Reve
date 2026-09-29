import { describe, expect, it } from 'vitest';
import { searchPattern } from '@/lib/admin/clients';

describe('searchPattern', () => {
  it('wraps a term for a contains match', () => {
    expect(searchPattern('maya')).toBe('*maya*');
  });

  /* Review Focus 2: PostgREST reads , ( ) as filter syntax inside or=(). */
  it('strips anything PostgREST would read as syntax', () => {
    expect(searchPattern('maya,email.neq.x')).toBe('*maya email.neq.x*');
    expect(searchPattern('(%*maya*)')).toBe('*maya*');
  });

  it('returns null for a blank search', () => {
    expect(searchPattern('  ,() ')).toBeNull();
  });
});
