import { beforeEach, describe, expect, it, vi } from 'vitest';

/* Hoisted with the mocks: vi.mock runs before this file's own top level. */
const { redirect, signInWithPassword, signOutSpy, maybeSingle } = vi.hoisted(
  () => ({
    redirect: (url: string): never => {
      throw new Error(`REDIRECT ${url}`);
    },
    signInWithPassword: vi.fn(),
    signOutSpy: vi.fn(),
    maybeSingle: vi.fn(),
  }),
);
vi.mock('next/navigation', () => ({ redirect }));
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { signInWithPassword, signOut: signOutSpy },
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle }) }) }),
  }),
}));

import { SIGN_IN_MESSAGES, signInAdmin, signOut } from '@/lib/auth/actions';

function form(fields: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('signInAdmin', () => {
  it('refuses a malformed email without calling Supabase', async () => {
    const result = await signInAdmin(null, form({ email: 'nope', password: 'x' }));

    expect(result).toEqual({ ok: false, message: SIGN_IN_MESSAGES.INVALID_INPUT });
    expect(signInWithPassword).not.toHaveBeenCalled();
  });

  it('gives one message for a wrong password or an unknown email', async () => {
    signInWithPassword.mockResolvedValue({
      data: { user: null },
      error: new Error('Invalid login credentials'),
    });

    const result = await signInAdmin(
      null,
      form({ email: 'ops@reve.lb', password: 'wrong' }),
    );

    expect(result).toEqual({ ok: false, message: SIGN_IN_MESSAGES.BAD_CREDENTIALS });
  });

  it('signs a non-admin straight back out', async () => {
    signInWithPassword.mockResolvedValue({
      data: { user: { id: 'client-1' } },
      error: null,
    });
    maybeSingle.mockResolvedValue({ data: null, error: null });

    const result = await signInAdmin(
      null,
      form({ email: 'maya@example.com', password: 'right-password' }),
    );

    expect(result).toEqual({ ok: false, message: SIGN_IN_MESSAGES.NOT_ADMIN });
    expect(signOutSpy).toHaveBeenCalled();
  });

  it('takes an admin to the admin home', async () => {
    signInWithPassword.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    });
    maybeSingle.mockResolvedValue({ data: { user_id: 'user-1' }, error: null });

    await expect(
      signInAdmin(null, form({ email: 'ops@reve.lb', password: 'right-password' })),
    ).rejects.toThrow('REDIRECT /admin');
  });
});

describe('signOut', () => {
  it('ends the session and returns to the login page', async () => {
    await expect(signOut()).rejects.toThrow('REDIRECT /admin/login');
    expect(signOutSpy).toHaveBeenCalled();
  });
});
