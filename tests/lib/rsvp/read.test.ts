import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeSupabase } from '../../helpers/fake-supabase';

const state = vi.hoisted(() => ({ fake: null as ReturnType<typeof fakeSupabase> | null }));
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => state.fake?.client }));

import { getGuestList } from '@/lib/rsvp/read';

const reply = (n: number) => ({
  name: `Guest ${n}`,
  attending: true,
  party_size: 1,
  dietary_notes: null,
  message: null,
  created_at: '2026-10-02T10:00:00Z',
});
const rows = (count: number, from = 0) => Array.from({ length: count }, (_, i) => reply(from + i));

beforeEach(() => {
  state.fake = null;
});

describe('getGuestList', () => {
  it('pages past the 1000-row cap so every reply is counted', async () => {
    state.fake = fakeSupabase({ rsvps: [{ data: rows(1000) }, { data: rows(3, 1000) }] });

    const summary = await getGuestList('inv-1');

    expect(summary.replies).toBe(1003);
    expect(summary.guests).toHaveLength(1003);
    const ranges = state.fake.calls.map((c) => c.chain.find((s) => s.method === 'range')?.args);
    expect(ranges).toEqual([
      [0, 999],
      [1000, 1999],
    ]);
  });

  it('orders by created_at then id so pages never overlap', async () => {
    state.fake = fakeSupabase({ rsvps: [{ data: rows(2) }] });
    await getGuestList('inv-1');
    const orders = state.fake.calls[0].chain
      .filter((s) => s.method === 'order')
      .map((s) => s.args[0]);
    expect(orders).toEqual(['created_at', 'id']);
  });

  it('stops after one request when the first page is short', async () => {
    state.fake = fakeSupabase({ rsvps: [{ data: rows(2) }] });
    await getGuestList('inv-1');
    expect(state.fake.calls).toHaveLength(1);
  });

  it('throws the database error', async () => {
    state.fake = fakeSupabase({ rsvps: [{ error: new Error('down') }] });
    await expect(getGuestList('inv-1')).rejects.toThrow('down');
  });
});
