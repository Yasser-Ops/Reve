import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  redirect,
  signInWithPassword,
  signOutSpy,
  getClaims,
  updateUser,
  maybeSingle,
  resetPasswordForEmail,
} = vi.hoisted(() => ({
  redirect: (url: string): never => {
    throw new Error(`REDIRECT ${url}`);
  },
  signInWithPassword: vi.fn(),
  signOutSpy: vi.fn(),
  getClaims: vi.fn(),
  updateUser: vi.fn(),
  maybeSingle: vi.fn(),
  resetPasswordForEmail: vi.fn(),
}));
vi.mock('next/navigation', () => ({ redirect }));
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { signInWithPassword, signOut: signOutSpy, getClaims, updateUser },
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle }) }) }),
  }),
}));
vi.mock('@/lib/supabase/mailer', () => ({
  createMailClient: () => ({ auth: { resetPasswordForEmail } }),
}));

import { UNEXPECTED } from '@/lib/admin/action-result';
import { PASSWORD_MESSAGES, PORTAL_MESSAGES, SIGN_IN_MESSAGES } from '@/lib/auth/messages';
import {
  requestReset,
  setNewPassword,
  signInClient,
  signOutClient,
} from '@/lib/auth/portal-actions';
import { confirmUrl, ROUTES } from '@/lib/routes';

function form(fields: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('signInClient', () => {
  const creds = form({ email: 'maya@example.com', password: 'right-password' });

  it('bad credentials give the one shared message', async () => {
    signInWithPassword.mockResolvedValue({ data: { user: null }, error: new Error('x') });
    await expect(signInClient(null, creds)).resolves.toEqual({
      ok: false,
      message: SIGN_IN_MESSAGES.BAD_CREDENTIALS,
    });
  });

  it('signed in without a client row signs out locally and says so', async () => {
    signInWithPassword.mockResolvedValue({ data: { user: { id: 'admin-1' } }, error: null });
    maybeSingle.mockResolvedValue({ data: null, error: null });

    await expect(signInClient(null, creds)).resolves.toEqual({
      ok: false,
      message: PORTAL_MESSAGES.NOT_CLIENT,
    });
    expect(signOutSpy).toHaveBeenCalledWith({ scope: 'local' });
  });

  it('success redirects to the portal', async () => {
    signInWithPassword.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
    maybeSingle.mockResolvedValue({ data: { id: 'client-1' }, error: null });
    await expect(signInClient(null, creds)).rejects.toThrow(/^REDIRECT \/portal$/);
  });
});

describe('signInClient lookup failure', () => {
  it('signs out and returns a message instead of throwing', async () => {
    signInWithPassword.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
    maybeSingle.mockResolvedValue({ data: null, error: new Error('db down') });
    vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(
      signInClient(null, form({ email: 'maya@example.com', password: 'right-password' })),
    ).resolves.toEqual({ ok: false, message: UNEXPECTED });
    expect(signOutSpy).toHaveBeenCalledWith({ scope: 'local' });
  });
});

describe('requestReset', () => {
  it('always answers ok, whatever Supabase says', async () => {
    resetPasswordForEmail.mockResolvedValue({ data: null, error: new Error('no such user') });
    await expect(requestReset(null, form({ email: 'ghost@example.com' }))).resolves.toEqual({
      ok: true,
    });
  });

  it('still answers ok when the mail client throws', async () => {
    resetPasswordForEmail.mockRejectedValue(new Error('network'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    await expect(requestReset(null, form({ email: 'maya@example.com' }))).resolves.toEqual({
      ok: true,
    });
  });

  it('sends the link through the implicit-flow client to the reset page', async () => {
    resetPasswordForEmail.mockResolvedValue({ data: {}, error: null });
    await requestReset(null, form({ email: 'maya@example.com' }));
    expect(resetPasswordForEmail).toHaveBeenCalledWith('maya@example.com', {
      redirectTo: confirmUrl(ROUTES.PORTAL_RESET),
    });
  });

  it('a malformed email is reported without calling Supabase', async () => {
    const result = await requestReset(null, form({ email: 'nope' }));
    expect(result.ok).toBe(false);
    expect(resetPasswordForEmail).not.toHaveBeenCalled();
  });
});

describe('setNewPassword', () => {
  const recoveryClaims = (amr: { method: string }[]) => ({
    data: { claims: { sub: 'user-1', email: 'maya@example.com', amr } },
    error: null,
  });
  const signedIn = recoveryClaims([{ method: 'recovery' }, { method: 'password' }]);

  beforeEach(() => {
    maybeSingle.mockResolvedValue({ data: { id: 'client-1' }, error: null });
  });

  it('refuses a session that did not come from a recovery link', async () => {
    getClaims.mockResolvedValue(recoveryClaims([{ method: 'password' }]));
    await expect(
      setNewPassword(null, form({ password: 'long-enough-1', confirm: 'long-enough-1' })),
    ).rejects.toThrow('REDIRECT /portal/login?notice=link-expired');
    expect(updateUser).not.toHaveBeenCalled();
  });

  it('refuses a recovery session that is not a client account', async () => {
    getClaims.mockResolvedValue(signedIn);
    maybeSingle.mockResolvedValue({ data: null, error: null });
    await expect(
      setNewPassword(null, form({ password: 'long-enough-1', confirm: 'long-enough-1' })),
    ).rejects.toThrow('REDIRECT /portal/login?notice=link-expired');
    expect(updateUser).not.toHaveBeenCalled();
  });

  it('reports when other sessions could not be ended', async () => {
    getClaims.mockResolvedValue(signedIn);
    updateUser.mockResolvedValue({ error: null });
    signOutSpy.mockResolvedValue({ error: new Error('nope') });
    await expect(
      setNewPassword(null, form({ password: 'long-enough-1', confirm: 'long-enough-1' })),
    ).resolves.toEqual({ ok: false, message: PASSWORD_MESSAGES.CHANGED_OTHERS_KEPT });
  });

  it('without claims sends the person to login with link-expired', async () => {
    getClaims.mockResolvedValue({ data: null, error: null });
    await expect(
      setNewPassword(null, form({ password: 'long-enough-1', confirm: 'long-enough-1' })),
    ).rejects.toThrow('REDIRECT /portal/login?notice=link-expired');
  });

  it('refuses a mismatched confirmation', async () => {
    getClaims.mockResolvedValue(signedIn);
    await expect(
      setNewPassword(null, form({ password: 'long-enough-1', confirm: 'different-1' })),
    ).resolves.toEqual({ ok: false, message: PASSWORD_MESSAGES.MISMATCH });
    expect(updateUser).not.toHaveBeenCalled();
  });

  it('refuses a password equal to the email', async () => {
    getClaims.mockResolvedValue(signedIn);
    const result = await setNewPassword(
      null,
      form({ password: 'maya@example.com', confirm: 'maya@example.com' }),
    );
    expect(result).toEqual({ ok: false, message: PASSWORD_MESSAGES.SAME_AS_EMAIL });
  });

  it('updates, ends other sessions and goes to the portal', async () => {
    getClaims.mockResolvedValue(signedIn);
    updateUser.mockResolvedValue({ error: null });
    signOutSpy.mockResolvedValue({ error: null });

    await expect(
      setNewPassword(null, form({ password: 'long-enough-1', confirm: 'long-enough-1' })),
    ).rejects.toThrow(/^REDIRECT \/portal$/);
    expect(updateUser).toHaveBeenCalledWith({ password: 'long-enough-1' });
    expect(signOutSpy).toHaveBeenCalledWith({ scope: 'others' });
  });
});

describe('signOutClient', () => {
  it('signs out and returns to login with the signed-out notice', async () => {
    await expect(signOutClient()).rejects.toThrow('REDIRECT /portal/login?notice=signed-out');
    expect(signOutSpy).toHaveBeenCalledWith();
  });
});
