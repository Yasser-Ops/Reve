import { beforeEach, describe, expect, it, vi } from 'vitest';

const { signInWithPassword, signOut, createClient } = vi.hoisted(() => {
  const signInWithPassword = vi.fn();
  const signOut = vi.fn();
  return {
    signInWithPassword,
    signOut,
    createClient: vi.fn(() => ({ auth: { signInWithPassword, signOut } })),
  };
});
vi.mock('@supabase/supabase-js', () => ({ createClient }));
vi.mock('@/lib/env', () => ({
  env: { NEXT_PUBLIC_SUPABASE_URL: 'https://x.supabase.co', NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon' },
}));

import { verifyPassword } from '@/lib/supabase/password-check';

beforeEach(() => {
  vi.clearAllMocks();
  signOut.mockResolvedValue({ error: null });
});

describe('verifyPassword', () => {
  /* Review minor: re-authenticating on the cookie client swapped the
     browser's session and left the old one alive. A throwaway client checks
     the password and its session is revoked straight away. */
  it('checks the password on a throwaway client and revokes that session', async () => {
    signInWithPassword.mockResolvedValue({ data: { session: {} }, error: null });

    await expect(verifyPassword('ops@reve.lb', 'secret')).resolves.toBe(true);
    expect(createClient).toHaveBeenCalledWith(
      'https://x.supabase.co',
      'anon',
      expect.objectContaining({
        auth: expect.objectContaining({ persistSession: false, autoRefreshToken: false }),
      }),
    );
    expect(signInWithPassword).toHaveBeenCalledWith({ email: 'ops@reve.lb', password: 'secret' });
    expect(signOut).toHaveBeenCalledWith({ scope: 'local' });
  });

  it('says no to a wrong password and leaves nothing to revoke', async () => {
    signInWithPassword.mockResolvedValue({ data: { session: null }, error: { code: 'x' } });

    await expect(verifyPassword('ops@reve.lb', 'wrong')).resolves.toBe(false);
    expect(signOut).not.toHaveBeenCalled();
  });
});
