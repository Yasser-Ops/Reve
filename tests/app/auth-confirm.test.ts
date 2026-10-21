import { beforeEach, describe, expect, it, vi } from 'vitest';

const { verifyOtp } = vi.hoisted(() => ({ verifyOtp: vi.fn() }));

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ auth: { verifyOtp } }),
}));

import { GET } from '@/app/auth/confirm/route';
import { confirmLink } from '@/lib/auth/links';
import { safeNext } from '@/lib/routes';

const ORIGIN = 'https://reve.test';
const call = (query: string) =>
  GET(new Request(`${ORIGIN}/auth/confirm?${query}`));

/** Where a redirect response points, relative to the origin. */
const target = (res: Response) =>
  (res.headers.get('location') ?? '').replace(ORIGIN, '');

describe('GET /auth/confirm', () => {
  beforeEach(() => {
    verifyOtp.mockReset().mockResolvedValue({ error: null });
  });

  it('token_hash + type=invite verifies and redirects to next', async () => {
    const res = await call('token_hash=abc&type=invite&next=/portal/welcome');
    expect(verifyOtp).toHaveBeenCalledWith({ token_hash: 'abc', type: 'invite' });
    expect(res.status).toBe(307);
    expect(target(res)).toBe('/portal/welcome');
  });

  it('token_hash + type=recovery verifies and redirects to the reset page', async () => {
    const res = await call('token_hash=abc&type=recovery&next=/portal/reset');
    expect(verifyOtp).toHaveBeenCalledWith({ token_hash: 'abc', type: 'recovery' });
    expect(target(res)).toBe('/portal/reset');
  });

  it('a failed verify lands on login with link-expired', async () => {
    verifyOtp.mockResolvedValue({ error: new Error('expired') });
    const res = await call('token_hash=abc&type=recovery&next=/portal/reset');
    expect(res.status).toBe(307);
    expect(target(res)).toBe('/portal/login?notice=link-expired');
  });

  it('an unknown type is treated as an expired link', async () => {
    const res = await call('token_hash=abc&type=magiclink');
    expect(verifyOtp).not.toHaveBeenCalled();
    expect(target(res)).toBe('/portal/login?notice=link-expired');
  });

  /* Rêve only ever sends token_hash links. A PKCE code, or an old
     Supabase-template email, is a link this site did not send. */
  it('a code-only link is treated as expired', async () => {
    const res = await call('code=xyz&next=/portal/reset');
    expect(verifyOtp).not.toHaveBeenCalled();
    expect(target(res)).toBe('/portal/login?notice=link-expired');
  });

  it('a link with no token is treated as expired', async () => {
    const res = await call('next=/portal/welcome');
    expect(verifyOtp).not.toHaveBeenCalled();
    expect(target(res)).toBe('/portal/login?notice=link-expired');
  });

  it('next outside /portal falls back to /portal', async () => {
    const res = await call(
      `token_hash=abc&type=invite&next=${encodeURIComponent('https://evil.example')}`,
    );
    expect(target(res)).toBe('/portal');
  });
});

describe('safeNext', () => {
  it.each([
    [null, '/portal'],
    ['/portal/settings', '/portal/settings'],
    ['/portalx', '/portal'],
    ['//evil.example', '/portal'],
    ['/admin', '/portal'],
    ['/portal/../admin', '/portal'],
    ['/portal/%2e%2e/admin', '/portal'],
    ['/portal/.%2e//evil.example', '/portal'],
    ['/portal/..//evil.example', '/portal'],
    ['/portal@evil', '/portal'],
    ['/portal\\evil', '/portal'],
    ['/\\evil.example', '/portal'],
    ['/portal/%252e%252e/admin', '/portal'],
    ['/portal/welcome?x=1', '/portal/welcome?x=1'],
  ])('%s -> %s', (input, expected) => {
    expect(safeNext(input)).toBe(expected);
  });
});

describe('confirmLink', () => {
  beforeEach(() => {
    verifyOtp.mockReset().mockResolvedValue({ error: null });
  });

  /* The link the emails carry must round-trip through GET above. */
  it('puts the token, type and next on the confirm route', async () => {
    const url = new URL(
      confirmLink({ tokenHash: 'abc', type: 'recovery', next: '/portal/reset' }),
    );
    expect(url.pathname).toBe('/auth/confirm');

    const res = await call(url.search.slice(1));
    expect(verifyOtp).toHaveBeenCalledWith({ token_hash: 'abc', type: 'recovery' });
    expect(target(res)).toBe('/portal/reset');
  });
});
