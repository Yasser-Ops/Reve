import { describe, expect, it } from 'vitest';
import { parseEnv } from '@/lib/env';

const valid = {
  NEXT_PUBLIC_SUPABASE_URL: 'https://abc.supabase.co',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-key-value',
  SUPABASE_SERVICE_ROLE_KEY: 'service-role-key-value',
};

describe('parseEnv', () => {
  it('returns a typed env object when every variable is present', () => {
    expect(parseEnv(valid)).toEqual(valid);
  });

  it('throws when a required variable is missing', () => {
    const { SUPABASE_SERVICE_ROLE_KEY: _omitted, ...incomplete } = valid;
    expect(() => parseEnv(incomplete)).toThrow(/SUPABASE_SERVICE_ROLE_KEY/);
  });

  it('throws when the Supabase URL is not a URL', () => {
    expect(() => parseEnv({ ...valid, NEXT_PUBLIC_SUPABASE_URL: 'not-a-url' })).toThrow();
  });

  it('throws when a key is an empty string', () => {
    expect(() => parseEnv({ ...valid, NEXT_PUBLIC_SUPABASE_ANON_KEY: '' })).toThrow();
  });
});
