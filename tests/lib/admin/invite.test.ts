import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeSupabase } from '../../helpers/fake-supabase';

const { state, invite, deleteUser, resetPassword, cookieReset } = vi.hoisted(() => ({
  state: { fake: null as ReturnType<typeof fakeSupabase> | null },
  invite: vi.fn(),
  deleteUser: vi.fn(),
  resetPassword: vi.fn(),
  cookieReset: vi.fn(),
}));
vi.mock('next/cache', () => ({ revalidatePath: () => {} }));
vi.mock('@/lib/auth/guards', () => ({
  requireAdmin: async () => ({ userId: 'admin-1', email: 'ops@reve.lb' }),
}));
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    ...state.fake?.client,
    auth: { resetPasswordForEmail: cookieReset },
  }),
}));
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({ auth: { admin: { inviteUserByEmail: invite, deleteUser } } }),
}));
vi.mock('@/lib/supabase/mailer', () => ({
  createMailClient: () => ({ auth: { resetPasswordForEmail: resetPassword } }),
}));
vi.mock('@/lib/site', () => ({ SITE_URL: 'https://reve.test' }));

import { UNEXPECTED } from '@/lib/admin/action-result';
import { inviteClient } from '@/lib/admin/invite';
import { accountState, hasPaidOrder } from '@/lib/admin/invite-state';
import { ROUTES, confirmUrl } from '@/lib/routes';

const CLIENT = '11111111-1111-4111-8111-111111111111';
const USER = '33333333-3333-4333-8333-333333333333';
const REDIRECT_TO = confirmUrl(ROUTES.PORTAL_WELCOME);

function form() {
  const data = new FormData();
  data.set('clientId', CLIENT);
  return data;
}

function clientRow(overrides: Record<string, unknown> = {}) {
  return {
    id: CLIENT,
    email: 'maya@gmail.com',
    user_id: null,
    terms_accepted_at: null,
    orders: [{ tier: 'managed', status: 'paid' }],
    ...overrides,
  };
}

beforeEach(() => {
  state.fake = null;
  invite.mockReset().mockResolvedValue({ data: { user: { id: USER } }, error: null });
  deleteUser.mockReset().mockResolvedValue({ error: null });
  resetPassword.mockReset().mockResolvedValue({ error: null });
  cookieReset.mockReset();
});

describe('inviteClient', () => {
  it('invites a client with no account and stores user_id', async () => {
    state.fake = fakeSupabase({ clients: [{ data: clientRow() }, { data: [{ id: CLIENT }] }] });

    await expect(inviteClient(null, form())).resolves.toEqual({ ok: true });

    expect(invite).toHaveBeenCalledWith('maya@gmail.com', { redirectTo: REDIRECT_TO });
    const write = state.fake.calls.filter((call) => call.table === 'clients')[1];
    expect(write.chain).toEqual([
      { method: 'update', args: [{ user_id: USER }] },
      { method: 'eq', args: ['id', CLIENT] },
      { method: 'is', args: ['user_id', null] },
      { method: 'select', args: ['id'] },
    ]);
  });

  it('refuses a client with no paid order', async () => {
    state.fake = fakeSupabase({
      clients: [{ data: clientRow({ orders: [{ tier: 'managed', status: 'pending_payment' }] }) }],
    });
    await expect(inviteClient(null, form())).resolves.toEqual({
      ok: false,
      message: 'Invite them once their payment is in.',
    });
    expect(invite).not.toHaveBeenCalled();
  });

  it('an invited client gets the email again without a new user', async () => {
    state.fake = fakeSupabase({ clients: [{ data: clientRow({ user_id: USER }) }] });

    await expect(inviteClient(null, form())).resolves.toEqual({ ok: true });

    expect(resetPassword).toHaveBeenCalledWith('maya@gmail.com', { redirectTo: REDIRECT_TO });
    expect(invite).not.toHaveBeenCalled();
    expect(cookieReset).not.toHaveBeenCalled();
    expect(state.fake.calls.filter((call) => call.table === 'clients')).toHaveLength(1);
  });

  it('an active client is not re-invited', async () => {
    state.fake = fakeSupabase({
      clients: [{ data: clientRow({ user_id: USER, terms_accepted_at: '2027-01-01T00:00:00Z' }) }],
    });
    await expect(inviteClient(null, form())).resolves.toEqual({
      ok: false,
      message: 'They already have an account.',
    });
    expect(resetPassword).not.toHaveBeenCalled();
    expect(invite).not.toHaveBeenCalled();
  });

  it('an email already registered elsewhere is refused', async () => {
    state.fake = fakeSupabase({ clients: [{ data: clientRow() }] });
    invite.mockResolvedValue({ data: { user: null }, error: { code: 'email_exists' } });
    await expect(inviteClient(null, form())).resolves.toEqual({
      ok: false,
      message: 'That email already has an account. Check it is not an admin address.',
    });
  });

  it('removes the new auth user when user_id cannot be stored', async () => {
    state.fake = fakeSupabase({
      clients: [{ data: clientRow() }, { error: { code: 'XX000' } }],
    });
    await expect(inviteClient(null, form())).resolves.toEqual({
      ok: false,
      message: UNEXPECTED,
    });
    expect(deleteUser).toHaveBeenCalledWith(USER);
  });

  it('removes the new auth user when no row took the user_id', async () => {
    state.fake = fakeSupabase({ clients: [{ data: clientRow() }, { data: [] }] });
    await expect(inviteClient(null, form())).resolves.toEqual({
      ok: false,
      message: UNEXPECTED,
    });
    expect(deleteUser).toHaveBeenCalledWith(USER);
  });

  it('reports the orphan instead of throwing when the cleanup fails too', async () => {
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {});
    state.fake = fakeSupabase({ clients: [{ data: clientRow() }, { data: [] }] });
    deleteUser.mockResolvedValue({ error: { message: 'x' } });
    await expect(inviteClient(null, form())).resolves.toEqual({
      ok: false,
      message:
        'The invite went out but could not be saved, and its sign-in could not be removed. Delete it under Supabase Auth.',
    });
    expect(logged).toHaveBeenCalledWith(expect.stringContaining(USER));
    logged.mockRestore();
  });

  it('tells the operator to wait when the email rate limit is hit', async () => {
    state.fake = fakeSupabase({ clients: [{ data: clientRow() }] });
    invite.mockResolvedValue({
      data: { user: null },
      error: { code: 'over_email_send_rate_limit', status: 429 },
    });
    await expect(inviteClient(null, form())).resolves.toEqual({
      ok: false,
      message: 'Too many emails just now. Try again in a minute.',
    });
  });

  it('maps a bare 429 on the resend to the same wait message', async () => {
    state.fake = fakeSupabase({ clients: [{ data: clientRow({ user_id: USER }) }] });
    resetPassword.mockResolvedValue({ error: { status: 429 } });
    await expect(inviteClient(null, form())).resolves.toEqual({
      ok: false,
      message: 'Too many emails just now. Try again in a minute.',
    });
  });
});

describe('hasPaidOrder', () => {
  it('is true once any order has reached paid, per its own tier flow', () => {
    expect(hasPaidOrder([])).toBe(false);
    expect(hasPaidOrder([{ tier: 'managed', status: 'pending_payment' }])).toBe(false);
    expect(hasPaidOrder([{ tier: 'custom', status: 'brief' }])).toBe(true);
    expect(
      hasPaidOrder([
        { tier: 'managed', status: 'cancelled' },
        { tier: 'basic', status: 'paid' },
      ]),
    ).toBe(true);
  });
});

describe('accountState', () => {
  it('reads the three stages from user_id and terms_accepted_at', () => {
    expect(accountState({ user_id: null, terms_accepted_at: null })).toBe('not_invited');
    expect(accountState({ user_id: USER, terms_accepted_at: null })).toBe('invited');
    expect(accountState({ user_id: USER, terms_accepted_at: '2027-01-01T00:00:00Z' })).toBe(
      'active',
    );
  });
});
