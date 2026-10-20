import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeSupabase } from '../../helpers/fake-supabase';

const { state } = vi.hoisted(() => ({
  state: { fake: null as ReturnType<typeof fakeSupabase> | null },
}));
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: () => state.fake?.client }));

import { submitRsvp } from '@/lib/rsvp/submit';
import { RSVP_MESSAGES } from '@/lib/schemas/rsvp';

const INVITATION = '11111111-1111-4111-8111-111111111111';

function form(fields: Record<string, string> = {}) {
  const data = new FormData();
  const all = {
    slug: 'maya-and-omar',
    name: '  Sara  ',
    attending: 'yes',
    partySize: '2',
    ...fields,
  };
  for (const [key, value] of Object.entries(all)) data.set(key, value);
  return data;
}

function invitationRow(overrides: Record<string, unknown> = {}) {
  return { id: INVITATION, status: 'published', entitlements: { rsvp: true }, ...overrides };
}

function insertCalls() {
  return state.fake?.calls.filter(
    (call) => call.table === 'rsvps' && call.chain.some((step) => step.method === 'insert'),
  );
}

const errorLog = vi.spyOn(console, 'error');

beforeEach(() => {
  state.fake = null;
  errorLog.mockReset();
  errorLog.mockImplementation(() => {});
});

afterEach(() => {
  errorLog.mockReset();
});

/** The log carries the failure, never the guest. */
function expectLoggedWithoutGuest(step: string) {
  expect(errorLog).toHaveBeenCalledTimes(1);
  const logged = JSON.stringify(errorLog.mock.calls[0]);
  expect(logged).toContain('[rsvp]');
  expect(logged).toContain(step);
  expect(logged).not.toContain('Sara');
  expect(logged).not.toContain('Congrats');
}

describe('submitRsvp', () => {
  it('stores a valid reply, trimmed, with empty notes as null', async () => {
    state.fake = fakeSupabase({ invitations: [{ data: invitationRow() }], rsvps: [{}] });
    const result = await submitRsvp(null, form({ dietaryNotes: '', message: ' Congrats ' }));
    expect(result).toEqual({ ok: true, attending: true });
    expect(state.fake.find('rsvps', 'insert')?.args[0]).toEqual({
      invitation_id: INVITATION,
      name: 'Sara',
      attending: true,
      party_size: 2,
      dietary_notes: null,
      message: 'Congrats',
    });
  });

  it('stores a decline as a party of one', async () => {
    state.fake = fakeSupabase({ invitations: [{ data: invitationRow() }], rsvps: [{}] });
    const result = await submitRsvp(null, form({ attending: 'no', partySize: '4' }));
    expect(result).toEqual({ ok: true, attending: false });
    expect(state.fake.find('rsvps', 'insert')?.args[0]).toMatchObject({
      attending: false,
      party_size: 1,
    });
  });

  it('pretends success on a filled honeypot and stores nothing', async () => {
    state.fake = fakeSupabase();
    const result = await submitRsvp(null, form({ company: 'Acme' }));
    expect(result.ok).toBe(true);
    expect(state.fake.calls).toHaveLength(0);
  });

  it('refuses an invalid reply without touching the database', async () => {
    state.fake = fakeSupabase();
    const result = await submitRsvp(null, form({ name: '' }));
    expect(result).toEqual({ ok: false, message: RSVP_MESSAGES.INVALID });
    expect(state.fake.calls).toHaveLength(0);
  });

  it.each([
    ['an unknown slug', { data: null }],
    ['an unpublished invitation', { data: invitationRow({ status: 'draft' }) }],
    ['replies switched off', { data: invitationRow({ entitlements: { rsvp: false } }) }],
  ])('refuses %s', async (_label, row) => {
    state.fake = fakeSupabase({ invitations: [row] });
    const result = await submitRsvp(null, form());
    expect(result).toEqual({ ok: false, message: 'Replies are not open for this invitation.' });
    expect(insertCalls()).toHaveLength(0);
  });

  it('returns a friendly message when the insert fails', async () => {
    state.fake = fakeSupabase({
      invitations: [{ data: invitationRow() }],
      rsvps: [{ error: { code: '23514', message: 'boom: secret detail' } }],
    });
    const result = await submitRsvp(null, form({ message: 'Congrats' }));
    expect(result).toEqual({
      ok: false,
      message: 'We could not send your reply. Please try again.',
    });
    expectLoggedWithoutGuest('insert');
    expect(JSON.stringify(errorLog.mock.calls[0])).toContain('23514');
  });

  it('returns a friendly message when the lookup fails', async () => {
    state.fake = fakeSupabase({ invitations: [{ error: { message: 'down' } }] });
    const result = await submitRsvp(null, form());
    expect(result).toEqual({ ok: false, message: RSVP_MESSAGES.FAILED });
    expectLoggedWithoutGuest('lookup');
  });

  it('logs and answers calmly when the client throws', async () => {
    state.fake = null;
    const result = await submitRsvp(null, form());
    expect(result).toEqual({ ok: false, message: RSVP_MESSAGES.FAILED });
    expectLoggedWithoutGuest('exception');
  });
});
