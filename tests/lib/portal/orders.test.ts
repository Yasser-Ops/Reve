import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeSupabase } from '../../helpers/fake-supabase';

const state = vi.hoisted(() => ({ fake: null as ReturnType<typeof fakeSupabase> | null }));
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => state.fake?.client }));

import { getPortalOrders } from '@/lib/portal/orders';

const review = (decision: string, createdAt: string) => ({
  decision,
  note: '',
  created_at: createdAt,
});

beforeEach(() => {
  state.fake = fakeSupabase({ orders: [{ data: [] }] });
});

describe('getPortalOrders', () => {
  it('embeds invitations and reviews, newest order first, without cancelled ones and without notes', async () => {
    await getPortalOrders();

    const select = String(state.fake?.find('orders', 'select')?.args[0]);
    expect(select).toContain('invitations(');
    expect(select).toContain('invitation_reviews(');
    expect(select).toContain('entitlements');
    expect(select).not.toContain('notes');
    expect(state.fake?.find('orders', 'order')?.args).toEqual([
      'created_at',
      { ascending: false },
    ]);
    expect(state.fake?.find('orders', 'neq')?.args).toEqual(['status', 'cancelled']);
  });

  it('keeps only the latest review of an invitation', async () => {
    state.fake = fakeSupabase({
      orders: [
        {
          data: [
            {
              id: 'o1',
              reference: 'REV-1',
              tier: 'basic',
              status: 'review',
              invitations: {
                id: 'i1',
                slug: 'maya-and-omar',
                status: 'draft',
                template_slug: 'velours',
                entitlements: { rsvp: true },
                content: {},
                invitation_reviews: [
                  review('changes_requested', '2026-10-01T10:00:00Z'),
                  review('approved', '2026-10-03T10:00:00Z'),
                  review('changes_requested', '2026-10-02T10:00:00Z'),
                  review('changes_requested', '2026-10-03T10:00:00.500Z'),
                ],
              },
            },
            {
              id: 'o2',
              reference: 'REV-2',
              tier: 'managed',
              status: 'paid',
              invitations: null,
            },
          ],
        },
      ],
    });

    const [first, second] = await getPortalOrders();

    expect(first.invitation?.templateSlug).toBe('velours');
    /* Same second as the approval, 500ms later: it is the latest, though a text sort puts it first or last by locale. */
    expect(first.invitation?.latestReview).toEqual({
      decision: 'changes_requested',
      note: '',
      createdAt: '2026-10-03T10:00:00.500Z',
    });
    expect(first.invitation?.entitlements).toEqual({ rsvp: true, portal: false, gallery: false });
    expect(second.invitation).toBeNull();
  });

  it('throws the database error into the segment', async () => {
    state.fake = fakeSupabase({ orders: [{ error: new Error('down') }] });
    await expect(getPortalOrders()).rejects.toThrow('down');
  });
});
