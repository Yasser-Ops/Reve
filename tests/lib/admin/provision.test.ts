import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeSupabase } from '../../helpers/fake-supabase';

const { redirect, state } = vi.hoisted(() => ({
  redirect: (url: string): never => {
    throw new Error(`REDIRECT ${url}`);
  },
  state: { fake: null as ReturnType<typeof fakeSupabase> | null },
}));
vi.mock('next/navigation', () => ({ redirect }));
vi.mock('next/cache', () => ({ revalidatePath: () => {} }));
vi.mock('@/lib/auth/guards', () => ({
  requireAdmin: async () => ({ userId: 'admin-1', email: 'ops@reve.lb' }),
}));
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => state.fake?.client }));

import { provisionInvitation } from '@/lib/admin/order-actions';

const ORDER_ID = '11111111-1111-4111-8111-111111111111';

function form(fields: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

const paidOrder = {
  id: ORDER_ID,
  tier: 'basic',
  status: 'paid',
  client_id: 'c',
  clients: { full_name: 'Maya Haddad' },
  invitations: null,
};

beforeEach(() => {
  state.fake = null;
});

describe('provisionInvitation', () => {
  /* Review Focus 5. */
  it('numbers the link when the name is taken', async () => {
    state.fake = fakeSupabase({
      orders: [{ data: paidOrder }],
      invitations: [{ data: [{ slug: 'maya-haddad' }] }, { data: { id: 'inv-1' } }],
    });

    await expect(
      provisionInvitation(null, form({ orderId: ORDER_ID, templateSlug: 'lin' })),
    ).rejects.toThrow('REDIRECT /admin/invitations/inv-1');
    expect(state.fake.find('invitations', 'insert')?.args[0]).toMatchObject({
      order_id: ORDER_ID,
      slug: 'maya-haddad-2',
      template_slug: 'lin',
      status: 'draft',
      entitlements: { rsvp: false, portal: false, gallery: true },
    });
  });

  it('refuses an order that has not been paid', async () => {
    state.fake = fakeSupabase({ orders: [{ data: { ...paidOrder, status: 'pending_payment' } }] });

    await expect(
      provisionInvitation(null, form({ orderId: ORDER_ID, templateSlug: 'lin' })),
    ).resolves.toEqual({ ok: false, message: 'Mark the order paid before creating its invitation.' });
  });

  it('refuses a design the registry does not have', async () => {
    state.fake = fakeSupabase({ orders: [{ data: paidOrder }] });

    await expect(
      provisionInvitation(null, form({ orderId: ORDER_ID, templateSlug: 'cap-blanc' })),
    ).resolves.toMatchObject({ ok: false });
  });
});
