import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeSupabase } from '../../helpers/fake-supabase';

const { state } = vi.hoisted(() => ({
  state: { fake: null as ReturnType<typeof fakeSupabase> | null },
}));
vi.mock('next/navigation', () => ({
  redirect: (url: string): never => {
    throw new Error(`REDIRECT ${url}`);
  },
}));
vi.mock('next/cache', () => ({ revalidatePath: () => {} }));
vi.mock('@/lib/auth/guards', () => ({
  requireAdmin: async () => ({ userId: 'admin-1', email: 'ops@reve.lb' }),
}));
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => state.fake?.client }));

import { applyUpgrade, moveOrder } from '@/lib/admin/order-actions';

const ORDER_ID = '11111111-1111-4111-8111-111111111111';

function form(fields: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

const validContent = {
  coupleFirstName: 'Maya',
  couplePartnerName: 'Karim',
  initials: 'MK',
  eventDate: '2027-06-12T17:00:00.000Z',
  venue: { name: 'Villa Rosa', addressLine: 'Broumana' },
};

function order(overrides: Record<string, unknown>) {
  return {
    data: {
      id: ORDER_ID,
      tier: 'managed',
      status: 'in_design',
      due_at: null,
      client_id: 'c',
      invitations: null,
      ...overrides,
    },
  };
}

beforeEach(() => {
  state.fake = null;
});

describe('moveOrder', () => {
  it('refuses a move the tier does not allow', async () => {
    state.fake = fakeSupabase({ orders: [order({ tier: 'basic', status: 'paid' })] });

    await expect(moveOrder(null, form({ orderId: ORDER_ID, to: 'brief' }))).resolves.toMatchObject({
      ok: false,
    });
    expect(state.fake.find('orders', 'update')).toBeUndefined();
  });

  it('sets the 48-hour due date when a ready-drawn order is paid', async () => {
    state.fake = fakeSupabase({
      orders: [order({ status: 'pending_payment' }), { data: null }],
    });

    await expect(moveOrder(null, form({ orderId: ORDER_ID, to: 'paid' }))).resolves.toEqual({
      ok: true,
    });
    const update = state.fake.find('orders', 'update')?.args[0];
    expect(update).toMatchObject({ status: 'paid' });
    expect(typeof (update as { due_at: unknown }).due_at).toBe('string');
  });

  /* Review Focus 4. */
  it('refuses review when there is no invitation', async () => {
    state.fake = fakeSupabase({ orders: [order({})] });

    await expect(moveOrder(null, form({ orderId: ORDER_ID, to: 'review' }))).resolves.toEqual({
      ok: false,
      message: 'Create the invitation before sending it for review.',
    });
  });

  it('refuses review while the content does not satisfy its design', async () => {
    state.fake = fakeSupabase({
      orders: [order({ invitations: { id: 'inv', template_slug: 'lin', content: {} } })],
    });

    await expect(moveOrder(null, form({ orderId: ORDER_ID, to: 'review' }))).resolves.toMatchObject({
      ok: false,
      message: 'The invitation content is not complete for its design yet.',
    });
  });

  it('sends complete content for review', async () => {
    state.fake = fakeSupabase({
      orders: [
        order({
          due_at: '2026-10-01T00:00:00Z',
          invitations: { id: 'inv', template_slug: 'lin', content: validContent },
        }),
        { data: null },
      ],
    });

    await expect(moveOrder(null, form({ orderId: ORDER_ID, to: 'review' }))).resolves.toEqual({
      ok: true,
    });
  });
});

describe('applyUpgrade', () => {
  it("raises the tier and re-resolves the invitation's entitlements", async () => {
    state.fake = fakeSupabase({
      orders: [{ data: { id: ORDER_ID, tier: 'basic', client_id: 'c' } }, { data: null }],
      invitations: [{ data: null }],
    });

    await expect(
      applyUpgrade(null, form({ orderId: ORDER_ID, tier: 'managed', amount: '100' })),
    ).resolves.toEqual({ ok: true });
    expect(state.fake.find('orders', 'update')?.args[0]).toEqual({ tier: 'managed', amount: 100 });
    expect(state.fake.find('invitations', 'update')?.args[0]).toEqual({
      entitlements: { rsvp: true, portal: true, gallery: true },
    });
  });

  it('refuses a downgrade', async () => {
    state.fake = fakeSupabase({
      orders: [{ data: { id: ORDER_ID, tier: 'managed', client_id: 'c' } }],
    });

    await expect(
      applyUpgrade(null, form({ orderId: ORDER_ID, tier: 'basic', amount: '50' })),
    ).resolves.toMatchObject({ ok: false });
  });
});
