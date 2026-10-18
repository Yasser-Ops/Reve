import { beforeEach, describe, expect, it, vi } from 'vitest';

const { redirect, getClaims, updateUser, maybeSingle, adminIs, adminEq, adminUpdate, adminFrom } =
  vi.hoisted(() => {
    const adminIs = vi.fn();
    const adminEq = vi.fn(() => ({ is: adminIs }));
    const adminUpdate = vi.fn(() => ({ eq: adminEq }));
    return {
      redirect: (url: string): never => {
        throw new Error(`REDIRECT ${url}`);
      },
      getClaims: vi.fn(),
      updateUser: vi.fn(),
      maybeSingle: vi.fn(),
      adminIs,
      adminEq,
      adminUpdate,
      adminFrom: vi.fn(() => ({ update: adminUpdate })),
    };
  });
vi.mock('next/navigation', () => ({ redirect }));
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getClaims, updateUser },
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle }) }) }),
  }),
}));
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: () => ({ from: adminFrom }) }));
vi.mock('@/lib/supabase/mailer', () => ({ createMailClient: () => ({}) }));

import { UNEXPECTED } from '@/lib/admin/action-result';
import { PASSWORD_MESSAGES, PORTAL_MESSAGES } from '@/lib/auth/messages';
import { acceptInvite } from '@/lib/auth/portal-actions';

function form(fields: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

const valid = { password: 'long-enough-1', confirm: 'long-enough-1', terms: 'on' };

function clientRow(termsAcceptedAt: string | null) {
  return {
    data: {
      id: 'client-1',
      email: 'maya@example.com',
      full_name: 'Maya Lee',
      terms_accepted_at: termsAcceptedAt,
    },
    error: null,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  getClaims.mockResolvedValue({
    data: { claims: { sub: 'user-1', email: 'maya@example.com' } },
    error: null,
  });
  maybeSingle.mockResolvedValue(clientRow(null));
  updateUser.mockResolvedValue({ error: null });
  adminIs.mockResolvedValue({ error: null });
});

describe('acceptInvite', () => {
  it('refuses without the terms box', async () => {
    await expect(acceptInvite(null, form({ ...valid, terms: '' }))).resolves.toEqual({
      ok: false,
      message: PORTAL_MESSAGES.TERMS_REQUIRED,
    });
    expect(PORTAL_MESSAGES.TERMS_REQUIRED).toBe(
      'Tick the box to accept the terms and confirm you are 18 or older.',
    );
    expect(updateUser).not.toHaveBeenCalled();
  });

  it('refuses mismatched passwords', async () => {
    await expect(
      acceptInvite(null, form({ ...valid, confirm: 'different-1' })),
    ).resolves.toEqual({ ok: false, message: PASSWORD_MESSAGES.MISMATCH });
    expect(updateUser).not.toHaveBeenCalled();
  });

  it('sets the password, then stamps terms through the admin client keyed on the claims user id', async () => {
    await expect(acceptInvite(null, form(valid))).rejects.toThrow(/^REDIRECT \/portal$/);

    expect(updateUser).toHaveBeenCalledWith({ password: 'long-enough-1' });
    expect(adminFrom).toHaveBeenCalledWith('clients');
    expect(adminUpdate).toHaveBeenCalledWith({
      terms_accepted_at: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
    });
    expect(adminEq).toHaveBeenCalledWith('user_id', 'user-1');
    expect(adminIs).toHaveBeenCalledWith('terms_accepted_at', null);
  });

  it('a weak_password refusal is worded', async () => {
    updateUser.mockResolvedValue({ error: { code: 'weak_password' } });
    await expect(acceptInvite(null, form(valid))).resolves.toEqual({
      ok: false,
      message: PASSWORD_MESSAGES.WEAK,
    });
    expect(adminUpdate).not.toHaveBeenCalled();
  });

  it('a failed stamp after the password was set is reported as unexpected', async () => {
    adminIs.mockResolvedValue({ error: new Error('db down') });
    vi.spyOn(console, 'error').mockImplementation(() => {});
    await expect(acceptInvite(null, form(valid))).resolves.toEqual({
      ok: false,
      message: UNEXPECTED,
    });
  });

  it('already accepted redirects to /portal without changing anything', async () => {
    maybeSingle.mockResolvedValue(clientRow('2026-10-01T00:00:00Z'));
    await expect(acceptInvite(null, form(valid))).rejects.toThrow(/^REDIRECT \/portal$/);
    expect(updateUser).not.toHaveBeenCalled();
    expect(adminUpdate).not.toHaveBeenCalled();
  });
});
