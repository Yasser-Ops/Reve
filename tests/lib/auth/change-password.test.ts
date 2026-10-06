import { beforeEach, describe, expect, it, vi } from 'vitest';

const { verifyPassword, updateUser, signOut } = vi.hoisted(() => ({
  verifyPassword: vi.fn(),
  updateUser: vi.fn(),
  signOut: vi.fn(),
}));
vi.mock('next/navigation', () => ({ redirect: vi.fn() }));
vi.mock('@/lib/auth/guards', () => ({
  requireAdmin: async () => ({ userId: 'admin-1', email: 'ops@reve.lb' }),
}));
vi.mock('@/lib/supabase/password-check', () => ({ verifyPassword }));
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ auth: { updateUser, signOut } }),
}));

import { changePassword } from '@/lib/auth/actions';
import { PASSWORD_MESSAGES } from '@/lib/auth/messages';

function form(fields: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

const valid = {
  current: 'old-password-1',
  next: 'a-much-longer-password',
  confirm: 'a-much-longer-password',
};

beforeEach(() => {
  vi.clearAllMocks();
  verifyPassword.mockResolvedValue(true);
  updateUser.mockResolvedValue({ data: {}, error: null });
  signOut.mockResolvedValue({ error: null });
});

describe('changePassword', () => {
  it('refuses a new password under 8 characters without calling Supabase', async () => {
    await expect(
      changePassword(null, form({ ...valid, next: 'short12', confirm: 'short12' })),
    ).resolves.toEqual({ ok: false, message: PASSWORD_MESSAGES.TOO_SHORT });
    expect(verifyPassword).not.toHaveBeenCalled();
  });

  it('accepts an 8-character password', async () => {
    await expect(
      changePassword(null, form({ ...valid, next: 'eight888', confirm: 'eight888' })),
    ).resolves.toEqual({ ok: true });
  });

  it('refuses when the two copies differ', async () => {
    await expect(
      changePassword(null, form({ ...valid, confirm: 'a-much-longer-passwurd' })),
    ).resolves.toEqual({ ok: false, message: PASSWORD_MESSAGES.MISMATCH });
    expect(verifyPassword).not.toHaveBeenCalled();
  });

  it('refuses a new password equal to the current one', async () => {
    await expect(
      changePassword(null, form({ current: valid.next, next: valid.next, confirm: valid.next })),
    ).resolves.toEqual({ ok: false, message: PASSWORD_MESSAGES.UNCHANGED });
  });

  it('checks the current password before changing anything', async () => {
    verifyPassword.mockResolvedValue(false);

    await expect(changePassword(null, form(valid))).resolves.toEqual({
      ok: false,
      message: PASSWORD_MESSAGES.WRONG_CURRENT,
    });
    expect(verifyPassword).toHaveBeenCalledWith('ops@reve.lb', valid.current);
    expect(updateUser).not.toHaveBeenCalled();
  });

  it('sets the new password and signs out every other device', async () => {
    await expect(changePassword(null, form(valid))).resolves.toEqual({ ok: true });
    expect(updateUser).toHaveBeenCalledWith({ password: valid.next });
    expect(signOut).toHaveBeenCalledWith({ scope: 'others' });
  });

  it('words Supabase refusing the password as weak', async () => {
    updateUser.mockResolvedValue({ data: null, error: { code: 'weak_password' } });
    await expect(changePassword(null, form(valid))).resolves.toEqual({
      ok: false,
      message: PASSWORD_MESSAGES.WEAK,
    });
    expect(signOut).not.toHaveBeenCalled();
  });

  it('words Supabase saying it is already the password', async () => {
    updateUser.mockResolvedValue({ data: null, error: { code: 'same_password' } });
    await expect(changePassword(null, form(valid))).resolves.toEqual({
      ok: false,
      message: PASSWORD_MESSAGES.UNCHANGED,
    });
  });

  it('still reports the change when signing out other devices fails', async () => {
    signOut.mockResolvedValue({ error: { code: 'unexpected_failure' } });
    await expect(changePassword(null, form(valid))).resolves.toEqual({
      ok: false,
      message: PASSWORD_MESSAGES.CHANGED_OTHERS_KEPT,
    });
  });
});
