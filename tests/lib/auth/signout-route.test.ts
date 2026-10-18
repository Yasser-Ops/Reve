import { beforeEach, describe, expect, it, vi } from 'vitest';

const { signOutSpy } = vi.hoisted(() => ({ signOutSpy: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ auth: { signOut: signOutSpy } }),
}));

import { GET } from '@/app/auth/signout/route';

const call = (query: string) => GET(new Request(`http://localhost/auth/signout${query}`));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /auth/signout', () => {
  it('signs out locally and forwards a known notice', async () => {
    const response = await call('?notice=not-client');
    expect(signOutSpy).toHaveBeenCalledWith({ scope: 'local' });
    expect(response.headers.get('location')).toBe(
      'http://localhost/portal/login?notice=not-client',
    );
  });

  it('drops a notice it does not know', async () => {
    const response = await call('?notice=evil');
    expect(response.headers.get('location')).toBe('http://localhost/portal/login');
  });

  it('works with no notice at all', async () => {
    const response = await call('');
    expect(response.headers.get('location')).toBe('http://localhost/portal/login');
  });
});
