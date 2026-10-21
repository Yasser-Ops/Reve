import { afterEach, describe, expect, it, vi } from 'vitest';
import { getPublicEnv, parseEnv } from '@/lib/env';

const valid = {
  NEXT_PUBLIC_SUPABASE_URL: 'https://abc.supabase.co',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-key-value',
  SUPABASE_SERVICE_ROLE_KEY: 'service-role-key-value',
  RESEND_API_KEY: 're_test_key',
};

describe('parseEnv', () => {
  it('returns a typed env object when every variable is present', () => {
    expect(parseEnv(valid)).toEqual(valid);
  });

  it('throws when a required variable is missing', () => {
    const { SUPABASE_SERVICE_ROLE_KEY: _omitted, ...incomplete } = valid;
    expect(() => parseEnv(incomplete)).toThrow(/SUPABASE_SERVICE_ROLE_KEY/);
  });

  /* A key pasted from the wrong service would fail every send at runtime. */
  it('throws when the Resend key is not a Resend key', () => {
    expect(() => parseEnv({ ...valid, RESEND_API_KEY: 'sk_live_abc' })).toThrow(/RESEND_API_KEY/);
  });

  it('throws when the Supabase URL is not a URL', () => {
    expect(() => parseEnv({ ...valid, NEXT_PUBLIC_SUPABASE_URL: 'not-a-url' })).toThrow();
  });

  it('throws when a key is an empty string', () => {
    expect(() => parseEnv({ ...valid, NEXT_PUBLIC_SUPABASE_ANON_KEY: '' })).toThrow();
  });
});

describe('getPublicEnv', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  /* The browser has no service key; reading the full env there would throw. */
  it('reads only the two public values', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://abc.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '');

    expect(getPublicEnv()).toEqual({
      NEXT_PUBLIC_SUPABASE_URL: 'https://abc.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon',
    });
  });
});
