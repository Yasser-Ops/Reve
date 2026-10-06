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

import { deleteClient } from '@/lib/admin/client-actions';

const CLIENT = '11111111-1111-4111-8111-111111111111';
const INVITATION = '22222222-2222-4222-8222-222222222222';

function form(fields: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

beforeEach(() => {
  state.fake = null;
});

describe('deleteClient', () => {
  it('deletes through the database function, then removes every uploaded file', async () => {
    state.fake = fakeSupabase(
      { 'rpc:admin_delete_client': [{ data: [INVITATION] }] },
      {
        files: {
          [`${INVITATION}/photos`]: [{ name: 'one.webp' }],
          [`${INVITATION}/hero`]: [{ name: 'hero.mp4' }],
        },
      },
    );

    await expect(
      deleteClient(null, form({ clientId: CLIENT, confirmName: 'Maya Haddad' })),
    ).rejects.toThrow('REDIRECT /admin?notice=client-deleted');

    expect(state.fake.find('rpc:admin_delete_client', 'rpc')?.args[0]).toEqual({
      p_client_id: CLIENT,
      p_confirm_name: 'Maya Haddad',
    });
    expect(state.fake.storageCalls.filter((call) => call.method === 'list')).toHaveLength(3);
    expect(state.fake.storageCalls.find((call) => call.method === 'remove')?.args).toEqual([
      'invitation-media',
      [`${INVITATION}/photos/one.webp`, `${INVITATION}/hero/hero.mp4`],
    ]);
  });

  it('refuses a name that does not match', async () => {
    state.fake = fakeSupabase({ 'rpc:admin_delete_client': [{ error: { code: 'RV001' } }] });
    await expect(
      deleteClient(null, form({ clientId: CLIENT, confirmName: 'Someone' })),
    ).resolves.toEqual({ ok: false, message: 'The name does not match.' });
  });

  /* Review Focus 2: the page was stale; the database still says no. */
  it('refuses while an invitation is published', async () => {
    state.fake = fakeSupabase({ 'rpc:admin_delete_client': [{ error: { code: 'RV002' } }] });
    await expect(
      deleteClient(null, form({ clientId: CLIENT, confirmName: 'Maya Haddad' })),
    ).resolves.toEqual({
      ok: false,
      message: 'Their invitation is live for guests, so this client cannot be deleted.',
    });
    expect(state.fake.storageCalls).toHaveLength(0);
  });

  it('still lands on the list when files could not be removed, and says so', async () => {
    state.fake = fakeSupabase(
      { 'rpc:admin_delete_client': [{ data: [INVITATION] }] },
      {
        files: { [`${INVITATION}/photos`]: [{ name: 'one.webp' }] },
        removeError: { message: 'x' },
      },
    );
    await expect(
      deleteClient(null, form({ clientId: CLIENT, confirmName: 'Maya Haddad' })),
    ).rejects.toThrow('REDIRECT /admin?notice=client-deleted-files-left');
  });

  it('asks for the name when none was typed', async () => {
    state.fake = fakeSupabase();
    await expect(
      deleteClient(null, form({ clientId: CLIENT, confirmName: '  ' })),
    ).resolves.toEqual({ ok: false, message: 'Type the client’s full name to confirm.' });
    expect(state.fake.calls).toHaveLength(0);
  });
});
