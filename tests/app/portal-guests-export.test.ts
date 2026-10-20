import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeSupabase } from '../helpers/fake-supabase';

const state = vi.hoisted(() => ({ fake: null as ReturnType<typeof fakeSupabase> | null }));
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => state.fake?.client }));
const requireClient = vi.hoisted(() => vi.fn(async () => ({ clientId: 'c1' })));
vi.mock('@/lib/auth/guards', () => ({ requireClient }));
vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND');
  },
}));

import { GET } from '@/app/portal/guests/[id]/export/route';

const ID = '3f2b8c1e-5d4a-4e6f-9a7b-1c2d3e4f5a6b';
const call = (id: string) => GET(new Request('http://localhost/x'), { params: Promise.resolve({ id }) });

const row = {
  name: 'Layla',
  attending: true,
  party_size: 2,
  dietary_notes: null,
  message: null,
  created_at: '2026-10-02T10:00:00Z',
};

beforeEach(() => {
  requireClient.mockClear();
  state.fake = fakeSupabase({
    invitations: [{ data: { slug: 'test-couple', entitlements: { rsvp: true } } }],
    rsvps: [{ data: [row] }],
  });
});

describe('guest list export', () => {
  it('requires a client before anything else', async () => {
    requireClient.mockRejectedValueOnce(new Error('NEXT_REDIRECT'));
    await expect(call(ID)).rejects.toThrow('NEXT_REDIRECT');
    expect(state.fake?.calls).toHaveLength(0);
  });

  it('is not found for an id that is not a uuid', async () => {
    await expect(call('nope')).rejects.toThrow('NEXT_NOT_FOUND');
    expect(state.fake?.calls).toHaveLength(0);
  });

  it('is not found when RLS hides the invitation', async () => {
    state.fake = fakeSupabase({ invitations: [{ data: null }] });
    await expect(call(ID)).rejects.toThrow('NEXT_NOT_FOUND');
  });

  it('is not found when replies were not bought', async () => {
    state.fake = fakeSupabase({
      invitations: [{ data: { slug: 'test-couple', entitlements: { rsvp: false } } }],
    });
    await expect(call(ID)).rejects.toThrow('NEXT_NOT_FOUND');
    expect(state.fake.calls.some((c) => c.table === 'rsvps')).toBe(false);
  });

  it('sends the CSV as an uncached download named for the invitation', async () => {
    const response = await call(ID);
    expect(response.headers.get('Content-Type')).toBe('text/csv; charset=utf-8');
    expect(response.headers.get('Content-Disposition')).toBe(
      'attachment; filename="guests-test-couple.csv"',
    );
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    /* text() strips the BOM, so check the raw bytes: Excel needs it for Arabic names. */
    const bytes = new Uint8Array(await response.clone().arrayBuffer());
    expect([...bytes.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
    const text = await response.text();
    expect(text.startsWith('Name,Coming,Guests')).toBe(true);
    expect(text).toContain('Layla,Yes,2');
  });
});
