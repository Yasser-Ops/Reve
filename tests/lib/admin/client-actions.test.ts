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
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => state.fake?.client,
}));

import { createClientWithOrder } from '@/lib/admin/client-actions';

function form(fields: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

const newClient = {
  fullName: 'Maya Haddad',
  email: 'Maya@Gmail.com',
  phone: '+961 70 000 000',
  tier: 'managed',
  amount: '100',
  eventDate: '2027-06-12',
  dueAt: '',
  notes: '',
};

beforeEach(() => {
  state.fake = null;
});

describe('createClientWithOrder', () => {
  it('stores the email lowercased and opens the new client', async () => {
    state.fake = fakeSupabase({
      clients: [{ data: { id: 'client-1' } }],
      orders: [{ data: null }],
    });

    await expect(createClientWithOrder(null, form(newClient))).rejects.toThrow(
      'REDIRECT /admin/clients/client-1',
    );
    expect(state.fake.find('clients', 'insert')?.args[0]).toMatchObject({
      email: 'maya@gmail.com',
      full_name: 'Maya Haddad',
    });
    expect(state.fake.find('orders', 'insert')?.args[0]).toMatchObject({
      client_id: 'client-1',
      tier: 'managed',
      amount: 100,
      event_date: '2027-06-12',
      due_at: null,
    });
  });

  /* Review Focus 3. */
  it('explains a duplicate email instead of surfacing a database error', async () => {
    state.fake = fakeSupabase({ clients: [{ error: { code: '23505' } }] });

    await expect(createClientWithOrder(null, form(newClient))).resolves.toEqual({
      ok: false,
      message: 'A client with this email already exists.',
    });
  });

  it('removes the client again when its order cannot be created', async () => {
    state.fake = fakeSupabase({
      clients: [{ data: { id: 'client-1' } }, { data: null }],
      orders: [{ error: { code: '23514' } }],
    });

    const result = await createClientWithOrder(null, form(newClient));

    expect(result).toMatchObject({ ok: false });
    expect(state.fake.find('clients', 'delete')).toBeDefined();
  });

  /* Review fix: a client with no order is invisible in the list, so a failed
     undo must be loud rather than leave one behind. */
  it('fails loudly when the client cannot be removed again', async () => {
    state.fake = fakeSupabase({
      clients: [{ data: { id: 'client-1' } }, { error: { code: '500', message: 'down' } }],
      orders: [{ error: { code: '23514' } }],
    });

    await expect(createClientWithOrder(null, form(newClient))).rejects.toThrow();
  });

  /* Final review: a typed due date stored as midnight UTC read as overdue
     for the whole day it was due. */
  it('stores a typed due date as the end of that day in Beirut', async () => {
    state.fake = fakeSupabase({
      clients: [{ data: { id: 'client-1' } }],
      orders: [{ data: null }],
    });

    await expect(
      createClientWithOrder(null, form({ ...newClient, dueAt: '2026-10-07' })),
    ).rejects.toThrow('REDIRECT');
    expect(state.fake.find('orders', 'insert')?.args[0]).toMatchObject({
      due_at: '2026-10-07 23:59:59 Asia/Beirut',
      event_date: '2027-06-12',
    });
  });

  it('refuses a tier that does not exist', async () => {
    state.fake = fakeSupabase();
    await expect(
      createClientWithOrder(null, form({ ...newClient, tier: 'platinum' })),
    ).resolves.toMatchObject({ ok: false });
  });
});
