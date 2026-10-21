import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeSupabase } from '../../helpers/fake-supabase';

const { state, mintAuthLink, recordEmail, sendEmail, deleteUser } = vi.hoisted(() => ({
  state: { fake: null as ReturnType<typeof fakeSupabase> | null },
  mintAuthLink: vi.fn(),
  recordEmail: vi.fn(),
  sendEmail: vi.fn(),
  deleteUser: vi.fn(),
}));
vi.mock('next/cache', () => ({ revalidatePath: () => {} }));
vi.mock('@/lib/auth/guards', () => ({
  requireAdmin: async () => ({ userId: 'admin-1', email: 'ops@reve.lb' }),
}));
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => state.fake?.client,
}));
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({ auth: { admin: { deleteUser } } }),
}));
vi.mock('@/lib/auth/auth-email', () => ({ mintAuthLink, recordEmail }));
vi.mock('@/lib/email/resend', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/email/resend')>()),
  sendEmail,
}));

import { UNEXPECTED } from '@/lib/admin/action-result';
import { inviteClient } from '@/lib/admin/invite';
import { accountState, hasPaidOrder } from '@/lib/admin/invite-state';
import { EmailSendError } from '@/lib/email/resend';
import { ROUTES } from '@/lib/routes';

const CLIENT = '11111111-1111-4111-8111-111111111111';
const USER = '33333333-3333-4333-8333-333333333333';
const LINK = 'https://reve.test/auth/confirm?token_hash=t&type=invite&next=%2Fportal%2Fwelcome';

function form() {
  const data = new FormData();
  data.set('clientId', CLIENT);
  return data;
}

function clientRow(overrides: Record<string, unknown> = {}) {
  return {
    id: CLIENT,
    email: 'maya@gmail.com',
    full_name: 'Maya Khoury',
    user_id: null,
    terms_accepted_at: null,
    orders: [{ tier: 'managed', status: 'paid' }],
    ...overrides,
  };
}

/** The one email sent, as handed to Resend. */
const sent = () => sendEmail.mock.calls[0]?.[0];

beforeEach(() => {
  state.fake = null;
  mintAuthLink.mockReset().mockResolvedValue({ url: LINK, userId: USER });
  recordEmail.mockReset().mockResolvedValue(undefined);
  sendEmail.mockReset().mockResolvedValue(undefined);
  deleteUser.mockReset().mockResolvedValue({ error: null });
});

describe('inviteClient', () => {
  it('invites a client with no account, stores user_id, then emails our link', async () => {
    state.fake = fakeSupabase({ clients: [{ data: clientRow() }, { data: [{ id: CLIENT }] }] });

    await expect(inviteClient(null, form())).resolves.toEqual({ ok: true });

    expect(mintAuthLink).toHaveBeenCalledWith(expect.anything(), {
      type: 'invite',
      email: 'maya@gmail.com',
      next: ROUTES.PORTAL_WELCOME,
    });
    const write = state.fake.calls.filter((call) => call.table === 'clients')[1];
    expect(write.chain).toEqual([
      { method: 'update', args: [{ user_id: USER }] },
      { method: 'eq', args: ['id', CLIENT] },
      { method: 'is', args: ['user_id', null] },
      { method: 'select', args: ['id'] },
    ]);
    expect(sent()).toMatchObject({ to: 'maya@gmail.com', subject: 'Your Rêve portal is ready' });
    expect(sent().text).toContain(LINK);
    expect(sent().text).toContain('Hello Maya,');
    expect(recordEmail).toHaveBeenCalledWith(expect.anything(), 'maya@gmail.com', 'invite');
  });

  it('refuses a client with no paid order', async () => {
    state.fake = fakeSupabase({
      clients: [{ data: clientRow({ orders: [{ tier: 'managed', status: 'pending_payment' }] }) }],
    });
    await expect(inviteClient(null, form())).resolves.toEqual({
      ok: false,
      message: 'Invite them once their payment is in.',
    });
    expect(mintAuthLink).not.toHaveBeenCalled();
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('an invited client gets a recovery link to the welcome step, without a new user', async () => {
    state.fake = fakeSupabase({ clients: [{ data: clientRow({ user_id: USER }) }] });

    await expect(inviteClient(null, form())).resolves.toEqual({ ok: true });

    expect(mintAuthLink).toHaveBeenCalledWith(expect.anything(), {
      type: 'recovery',
      email: 'maya@gmail.com',
      next: ROUTES.PORTAL_WELCOME,
    });
    expect(sent()).toMatchObject({ to: 'maya@gmail.com', subject: 'Your Rêve portal is ready' });
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
    expect(mintAuthLink).not.toHaveBeenCalled();
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('an email already registered elsewhere is refused', async () => {
    state.fake = fakeSupabase({ clients: [{ data: clientRow() }] });
    mintAuthLink.mockResolvedValue({ error: { code: 'email_exists' } });
    await expect(inviteClient(null, form())).resolves.toEqual({
      ok: false,
      message: 'That email already has an account. Check it is not an admin address.',
    });
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('removes the new auth user, unemailed, when user_id cannot be stored', async () => {
    state.fake = fakeSupabase({
      clients: [{ data: clientRow() }, { error: { code: 'XX000' } }],
    });
    await expect(inviteClient(null, form())).resolves.toEqual({
      ok: false,
      message: UNEXPECTED,
    });
    expect(deleteUser).toHaveBeenCalledWith(USER);
    expect(sendEmail).not.toHaveBeenCalled();
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
        'The account was made but could not be saved, and could not be removed. Delete it under Supabase Auth.',
    });
    expect(logged).toHaveBeenCalledWith(expect.stringContaining(USER));
    logged.mockRestore();
  });

  /* The account exists by now, so the client reads as invited and the
     operator's button becomes "send again", which is the fix. */
  it('a failed send keeps the account and asks to send again', async () => {
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {});
    state.fake = fakeSupabase({ clients: [{ data: clientRow() }, { data: [{ id: CLIENT }] }] });
    sendEmail.mockRejectedValue(new EmailSendError(422, 'refused'));
    await expect(inviteClient(null, form())).resolves.toEqual({
      ok: false,
      message: 'The account is ready but the email did not go out. Send it again.',
    });
    expect(deleteUser).not.toHaveBeenCalled();
    expect(recordEmail).not.toHaveBeenCalled();
    logged.mockRestore();
  });

  it('tells the operator to wait when Resend rate-limits', async () => {
    state.fake = fakeSupabase({ clients: [{ data: clientRow({ user_id: USER }) }] });
    sendEmail.mockRejectedValue(new EmailSendError(429, 'rate-limited'));
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
