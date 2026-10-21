import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeSupabase } from '../../helpers/fake-supabase';

vi.mock('@/lib/site', () => ({ SITE_URL: 'https://reve.test' }));

import { mayEmail, mintAuthLink, recordEmail } from '@/lib/auth/auth-email';

type Admin = Parameters<typeof mayEmail>[0];

const NOW = new Date('2027-03-01T12:00:00Z');
const ago = (ms: number) => new Date(NOW.getTime() - ms).toISOString();

/** An admin client whose next auth_email_sends read returns these rows. */
function withLog(rows: { sent_at: string }[]) {
  const fake = fakeSupabase({ auth_email_sends: [{ data: rows }] });
  return { fake, admin: fake.client as unknown as Admin };
}

describe('mayEmail', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('allows an address with nothing sent in the last hour', async () => {
    const { admin, fake } = withLog([]);
    await expect(mayEmail(admin, 'maya@example.com', 'recovery')).resolves.toBe(true);
    expect(fake.calls[0].chain).toEqual(
      expect.arrayContaining([
        { method: 'eq', args: ['email', 'maya@example.com'] },
        { method: 'eq', args: ['kind', 'recovery'] },
        { method: 'gte', args: ['sent_at', ago(60 * 60 * 1000)] },
      ]),
    );
  });

  it('refuses a second email within the minute', async () => {
    const { admin } = withLog([{ sent_at: ago(30 * 1000) }]);
    await expect(mayEmail(admin, 'maya@example.com', 'recovery')).resolves.toBe(false);
  });

  it('allows one once the minute has passed', async () => {
    const { admin } = withLog([{ sent_at: ago(61 * 1000) }]);
    await expect(mayEmail(admin, 'maya@example.com', 'recovery')).resolves.toBe(true);
  });

  it('refuses a sixth email in the hour', async () => {
    const rows = [5, 15, 25, 35, 45].map((minutes) => ({ sent_at: ago(minutes * 60 * 1000) }));
    const { admin } = withLog(rows);
    await expect(mayEmail(admin, 'maya@example.com', 'recovery')).resolves.toBe(false);
  });

  /* An unreadable log must not turn the public reset form into an open relay. */
  it('throws rather than allowing when the log cannot be read', async () => {
    const fake = fakeSupabase({ auth_email_sends: [{ error: { message: 'down' } }] });
    await expect(
      mayEmail(fake.client as unknown as Admin, 'maya@example.com', 'recovery'),
    ).rejects.toThrow(/unreadable/);
  });
});

describe('recordEmail', () => {
  it('logs the address and kind', async () => {
    const fake = fakeSupabase({ auth_email_sends: [{ data: null }] });
    await recordEmail(fake.client as unknown as Admin, 'maya@example.com', 'invite');
    expect(fake.calls[0].chain).toEqual([
      { method: 'insert', args: [{ email: 'maya@example.com', kind: 'invite' }] },
    ]);
  });
});

describe('mintAuthLink', () => {
  const adminWith = (generateLink: ReturnType<typeof vi.fn>) =>
    ({ auth: { admin: { generateLink } } }) as unknown as Admin;

  it('wraps the hashed token in our own confirm link', async () => {
    const generateLink = vi.fn().mockResolvedValue({
      data: { user: { id: 'user-1' }, properties: { hashed_token: 'hash-1' } },
      error: null,
    });

    const link = await mintAuthLink(adminWith(generateLink), {
      type: 'invite',
      email: 'maya@example.com',
      next: '/portal/welcome',
    });

    expect(generateLink).toHaveBeenCalledWith({ type: 'invite', email: 'maya@example.com' });
    expect(link).toEqual({
      userId: 'user-1',
      url: 'https://reve.test/auth/confirm?token_hash=hash-1&type=invite&next=%2Fportal%2Fwelcome',
    });
  });

  it('hands back the error, with its code, when Supabase refuses', async () => {
    const generateLink = vi.fn().mockResolvedValue({
      data: { user: null, properties: null },
      error: { code: 'email_exists', status: 422 },
    });
    await expect(
      mintAuthLink(adminWith(generateLink), {
        type: 'invite',
        email: 'maya@example.com',
        next: '/portal/welcome',
      }),
    ).resolves.toEqual({ error: { code: 'email_exists', status: 422 } });
  });
});
