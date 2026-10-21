import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  redirect,
  signInWithPassword,
  signOutSpy,
  getClaims,
  updateUser,
  maybeSingle,
  changePasswordAs,
  admin,
  mintAuthLink,
  mayEmail,
  recordEmail,
  sendEmail,
} = vi.hoisted(() => ({
  admin: { fake: null as unknown },
  mintAuthLink: vi.fn(),
  mayEmail: vi.fn(),
  recordEmail: vi.fn(),
  sendEmail: vi.fn(),
  changePasswordAs: vi.fn(),
  redirect: (url: string): never => {
    throw new Error(`REDIRECT ${url}`);
  },
  signInWithPassword: vi.fn(),
  signOutSpy: vi.fn(),
  getClaims: vi.fn(),
  updateUser: vi.fn(),
  maybeSingle: vi.fn(),
}));
vi.mock('next/navigation', () => ({ redirect }));
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { signInWithPassword, signOut: signOutSpy, getClaims, updateUser },
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle }) }) }),
  }),
}));
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: () => admin.fake }));
vi.mock('@/lib/auth/auth-email', () => ({ mintAuthLink, mayEmail, recordEmail }));
vi.mock('@/lib/email/resend', () => ({ sendEmail }));

vi.mock('@/lib/auth/password-change', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/auth/password-change')>()),
  changePasswordAs,
}));

import { UNEXPECTED } from '@/lib/admin/action-result';
import { PASSWORD_MESSAGES, PORTAL_MESSAGES, SIGN_IN_MESSAGES } from '@/lib/auth/messages';
import {
  changeClientPassword,
  requestReset,
  setNewPassword,
  signInClient,
  signOutClient,
} from '@/lib/auth/portal-actions';
import { ROUTES } from '@/lib/routes';
import { fakeSupabase } from '../../helpers/fake-supabase';

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
  const LINK = 'https://reve.test/auth/confirm?token_hash=t&type=recovery&next=%2Fportal%2Freset';
  /** Whether a client with an account owns the address. */
  const clientLookup = (found: boolean) => {
    const fake = fakeSupabase({ clients: [{ data: found ? { id: 'client-1' } : null }] });
    admin.fake = fake.client;
    return fake;
  };

  beforeEach(() => {
    mayEmail.mockResolvedValue(true);
    mintAuthLink.mockResolvedValue({ url: LINK, userId: 'user-1' });
    sendEmail.mockResolvedValue(undefined);
  });

  it('emails a client our own reset link to the reset page, and logs it', async () => {
    const fake = clientLookup(true);
    await expect(requestReset(null, form({ email: ' Maya@Example.com ' }))).resolves.toEqual({
      ok: true,
    });

    expect(fake.calls[0].chain).toContainEqual({ method: 'eq', args: ['email', 'maya@example.com'] });
    expect(mintAuthLink).toHaveBeenCalledWith(admin.fake, {
      type: 'recovery',
      email: 'maya@example.com',
      next: ROUTES.PORTAL_RESET,
    });
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'maya@example.com', subject: 'Reset your Rêve password' }),
    );
    expect(sendEmail.mock.calls[0][0].text).toContain(LINK);
    expect(recordEmail).toHaveBeenCalledWith(admin.fake, 'maya@example.com', 'recovery');
  });

  /* Same answer either way, so the form cannot reveal who has an account. */
  it('sends nothing to an address with no client account, and still answers ok', async () => {
    clientLookup(false);
    await expect(requestReset(null, form({ email: 'ghost@example.com' }))).resolves.toEqual({
      ok: true,
    });
    expect(mintAuthLink).not.toHaveBeenCalled();
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('sends nothing while the address is cooling down, and still answers ok', async () => {
    clientLookup(true);
    mayEmail.mockResolvedValue(false);
    await expect(requestReset(null, form({ email: 'maya@example.com' }))).resolves.toEqual({
      ok: true,
    });
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('still answers ok when sending fails', async () => {
    clientLookup(true);
    sendEmail.mockRejectedValue(new Error('network'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    await expect(requestReset(null, form({ email: 'maya@example.com' }))).resolves.toEqual({
      ok: true,
    });
    expect(recordEmail).not.toHaveBeenCalled();
  });

  it('a malformed email is reported without touching the database', async () => {
    admin.fake = null;
    const result = await requestReset(null, form({ email: 'nope' }));
    expect(result.ok).toBe(false);
    expect(mintAuthLink).not.toHaveBeenCalled();
  });
});

describe('setNewPassword', () => {
  /* Stamped now: getRecoveryClient only honours a recent recovery. */
  const at = () => Math.floor(Date.now() / 1000);
  const recoveryClaims = (methods: string[]) => ({
    data: {
      claims: {
        sub: 'user-1',
        email: 'maya@example.com',
        amr: methods.map((method) => ({ method, timestamp: at() })),
      },
    },
    error: null,
  });
  const signedIn = recoveryClaims(['recovery', 'password']);

  beforeEach(() => {
    maybeSingle.mockResolvedValue({ data: { id: 'client-1' }, error: null });
  });

  it('refuses a session that did not come from a recovery link', async () => {
    getClaims.mockResolvedValue(recoveryClaims(['password']));
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

  it('goes on to the portal with a notice when other sessions could not be ended', async () => {
    getClaims.mockResolvedValue(signedIn);
    updateUser.mockResolvedValue({ error: null });
    signOutSpy.mockResolvedValue({ error: new Error('nope') });
    await expect(
      setNewPassword(null, form({ password: 'long-enough-1', confirm: 'long-enough-1' })),
    ).rejects.toThrow('REDIRECT /portal?notice=others-kept');
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

describe('changeClientPassword', () => {
  const fields = form({ current: 'old-password-1', next: 'new-password-1', confirm: 'new-password-1' });

  it('requires a client and delegates', async () => {
    getClaims.mockResolvedValue({
      data: { claims: { sub: 'user-1', email: 'maya@example.com' } },
      error: null,
    });
    maybeSingle.mockResolvedValue({
      data: {
        id: 'client-1',
        full_name: 'Maya',
        email: 'maya@example.com',
        phone: '',
        terms_accepted_at: '2026-01-01T00:00:00Z',
      },
      error: null,
    });
    changePasswordAs.mockResolvedValue({ ok: true });

    await expect(changeClientPassword(null, fields)).resolves.toEqual({ ok: true });
    expect(changePasswordAs).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'maya@example.com' }),
      fields,
    );
  });

  it('without a session redirects to login and changes nothing', async () => {
    getClaims.mockResolvedValue({ data: null, error: null });
    await expect(changeClientPassword(null, fields)).rejects.toThrow(
      /^REDIRECT \/portal\/login$/,
    );
    expect(changePasswordAs).not.toHaveBeenCalled();
  });
});

describe('signOutClient', () => {
  it('signs out this device only and returns to login with the signed-out notice', async () => {
    await expect(signOutClient()).rejects.toThrow('REDIRECT /portal/login?notice=signed-out');
    expect(signOutSpy).toHaveBeenCalledWith({ scope: 'local' });
  });
});
