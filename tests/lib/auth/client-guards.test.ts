import { beforeEach, describe, expect, it, vi } from 'vitest';

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

import { requireClient, requireClientAccount } from '@/lib/auth/guards';

const claims = { data: { claims: { sub: 'user-1', email: 'maya@example.com' } }, error: null };
const row = (termsAcceptedAt: string | null) => ({
  data: {
    id: 'client-1',
    full_name: 'Maya and Karim',
    email: 'maya@example.com',
    phone: '+96170000000',
    terms_accepted_at: termsAcceptedAt,
  },
  error: null,
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe('requireClient', () => {
  it('no claims redirects to /portal/login', async () => {
    getClaims.mockResolvedValue({ data: null, error: null });
    await expect(requireClient()).rejects.toThrow(/^REDIRECT \/portal\/login$/);
  });

  it('an admin with no client row is sent to the local sign-out route and told so', async () => {
    getClaims.mockResolvedValue(claims);
    maybeSingle.mockResolvedValue({ data: null, error: null });
    await expect(requireClientAccount()).rejects.toThrow(
      'REDIRECT /auth/signout?notice=not-client',
    );
  });

  it('terms not accepted redirects to welcome', async () => {
    getClaims.mockResolvedValue(claims);
    maybeSingle.mockResolvedValue(row(null));
    await expect(requireClient()).rejects.toThrow('REDIRECT /portal/welcome');
  });

  it('requireClientAccount lets an unaccepted client through', async () => {
    getClaims.mockResolvedValue(claims);
    maybeSingle.mockResolvedValue(row(null));
    await expect(requireClientAccount()).resolves.toEqual({
      userId: 'user-1',
      email: 'maya@example.com',
      clientId: 'client-1',
      fullName: 'Maya and Karim',
      termsAcceptedAt: null,
    });
  });

  it('crashes loudly when the client read fails', async () => {
    getClaims.mockResolvedValue(claims);
    maybeSingle.mockResolvedValue({ data: null, error: new Error('db down') });
    await expect(requireClientAccount()).rejects.toThrow('db down');
  });
});
