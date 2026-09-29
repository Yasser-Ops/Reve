import { beforeEach, describe, expect, it, vi } from 'vitest';

/* Hoisted with the mocks: vi.mock runs before this file's own top level. */
const { redirect, getClaims, maybeSingle } = vi.hoisted(() => ({
  redirect: (url: string): never => {
    throw new Error(`REDIRECT ${url}`);
  },
  getClaims: vi.fn(),
  maybeSingle: vi.fn(),
}));
vi.mock('next/navigation', () => ({ redirect }));
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getClaims },
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle }) }) }),
  }),
}));

import { requireAdmin } from '@/lib/auth/guards';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('requireAdmin', () => {
  it('returns the identity of a signed-in admin', async () => {
    getClaims.mockResolvedValue({
      data: { claims: { sub: 'user-1', email: 'ops@reve.lb' } },
      error: null,
    });
    maybeSingle.mockResolvedValue({ data: { user_id: 'user-1' }, error: null });

    await expect(requireAdmin()).resolves.toEqual({
      userId: 'user-1',
      email: 'ops@reve.lb',
    });
  });

  it('sends a visitor with no session to the login page', async () => {
    getClaims.mockResolvedValue({ data: null, error: null });
    await expect(requireAdmin()).rejects.toThrow('REDIRECT /admin/login');
  });

  /* Review Focus 2: an expired or forged cookie is an error, not a crash. */
  it('treats an invalid session as signed out', async () => {
    getClaims.mockResolvedValue({ data: null, error: new Error('invalid JWT') });
    await expect(requireAdmin()).rejects.toThrow('REDIRECT /admin/login');
  });

  /* Review Focus 1: every client will hold a valid session. */
  it('turns away a signed-in account that is not an admin', async () => {
    getClaims.mockResolvedValue({
      data: { claims: { sub: 'client-1', email: 'maya@example.com' } },
      error: null,
    });
    maybeSingle.mockResolvedValue({ data: null, error: null });

    await expect(requireAdmin()).rejects.toThrow(
      'REDIRECT /admin/login?notice=not-admin',
    );
  });

  it('crashes loudly when the membership read itself fails', async () => {
    getClaims.mockResolvedValue({
      data: { claims: { sub: 'user-1', email: 'ops@reve.lb' } },
      error: null,
    });
    maybeSingle.mockResolvedValue({ data: null, error: new Error('db down') });

    await expect(requireAdmin()).rejects.toThrow('db down');
  });
});
