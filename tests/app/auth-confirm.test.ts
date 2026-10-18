import { beforeEach, describe, expect, it, vi } from 'vitest';

const { verifyOtp, exchangeCodeForSession } = vi.hoisted(() => ({
  verifyOtp: vi.fn(),
  exchangeCodeForSession: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ auth: { verifyOtp, exchangeCodeForSession } }),
}));

import { GET } from '@/app/auth/confirm/route';
import { confirmUrl, safeNext } from '@/lib/routes';

const ORIGIN = 'https://reve.test';
const call = (query: string) =>
  GET(new Request(`${ORIGIN}/auth/confirm?${query}`));

/** Where a redirect response points, relative to the origin. */
const target = (res: Response) =>
  (res.headers.get('location') ?? '').replace(ORIGIN, '');

describe('GET /auth/confirm', () => {
  beforeEach(() => {
    verifyOtp.mockReset().mockResolvedValue({ error: null });
    exchangeCodeForSession.mockReset().mockResolvedValue({ error: null });
  });

  it('token_hash + type=invite verifies and redirects to next', async () => {
    const res = await call('token_hash=abc&type=invite&next=/portal/welcome');
    expect(verifyOtp).toHaveBeenCalledWith({ token_hash: 'abc', type: 'invite' });
    expect(res.status).toBe(307);
    expect(target(res)).toBe('/portal/welcome');
  });

  it('code exchanges for a session', async () => {
    const res = await call('code=xyz&next=/portal/reset');
    expect(exchangeCodeForSession).toHaveBeenCalledWith('xyz');
    expect(target(res)).toBe('/portal/reset');
  });

  it('a failed verify lands on login with link-expired', async () => {
    verifyOtp.mockResolvedValue({ error: new Error('expired') });
    const res = await call('token_hash=abc&type=recovery&next=/portal/reset');
    expect(res.status).toBe(307);
    expect(target(res)).toBe('/portal/login?notice=link-expired');
  });

  it('a failed code exchange lands on login with link-expired', async () => {
    exchangeCodeForSession.mockResolvedValue({ error: new Error('bad') });
    const res = await call('code=xyz');
    expect(target(res)).toBe('/portal/login?notice=link-expired');
  });

  it('an unknown type is treated as an expired link', async () => {
    const res = await call('token_hash=abc&type=magiclink');
    expect(verifyOtp).not.toHaveBeenCalled();
    expect(target(res)).toBe('/portal/login?notice=link-expired');
  });

  it('next outside /portal falls back to /portal', async () => {
    const res = await call(
      `token_hash=abc&type=email&next=${encodeURIComponent('https://evil.example')}`,
    );
    expect(target(res)).toBe('/portal');
  });

  it('no token and no code goes to /auth/session keeping next', async () => {
    const res = await call('next=/portal/welcome');
    expect(res.status).toBe(307);
    expect(target(res)).toBe('/auth/session?next=%2Fportal%2Fwelcome');
    expect(verifyOtp).not.toHaveBeenCalled();
  });
});

describe('safeNext', () => {
  it.each([
    [null, '/portal'],
    ['/portal/settings', '/portal/settings'],
    ['/portalx', '/portal'],
    ['//evil.example', '/portal'],
    ['/admin', '/portal'],
  ])('%s -> %s', (input, expected) => {
    expect(safeNext(input)).toBe(expected);
  });
});

describe('confirmUrl', () => {
  it('encodes next onto the confirm route', () => {
    expect(confirmUrl('/portal/welcome')).toMatch(
      /\/auth\/confirm\?next=%2Fportal%2Fwelcome$/,
    );
  });
});
