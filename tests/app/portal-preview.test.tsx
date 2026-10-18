import { describe, expect, it, vi } from 'vitest';
import { fakeSupabase } from '../helpers/fake-supabase';

const { state, requireClient, createClient } = vi.hoisted(() => ({
  state: { fake: null as ReturnType<typeof fakeSupabase> | null },
  requireClient: vi.fn(async () => ({ clientId: 'client-1' })),
  createClient: vi.fn(async () => state.fake?.client),
}));
vi.mock('next/navigation', () => ({
  notFound: (): never => {
    throw new Error('NOT_FOUND');
  },
}));
vi.mock('@/lib/auth/guards', () => ({ requireClient }));
vi.mock('@/lib/supabase/server', () => ({ createClient }));

import PortalPreviewPage from '@/app/portal/preview/[id]/page';

const INV = '22222222-2222-4222-8222-222222222222';
const params = (id: string) => ({ params: Promise.resolve({ id }) });

describe('/portal/preview/[id]', () => {
  it('requires a client before reading anything', async () => {
    requireClient.mockRejectedValueOnce(new Error('NEXT_REDIRECT'));
    state.fake = fakeSupabase({ invitations: [{ data: null }] });

    await expect(PortalPreviewPage(params(INV))).rejects.toThrow('NEXT_REDIRECT');
    expect(createClient).not.toHaveBeenCalled();
  });

  it('is not found when RLS hides the invitation', async () => {
    state.fake = fakeSupabase({ invitations: [{ data: null }] });
    await expect(PortalPreviewPage(params(INV))).rejects.toThrow('NOT_FOUND');
  });

  it('is not found for an id that is not a uuid', async () => {
    state.fake = fakeSupabase();
    await expect(PortalPreviewPage(params('nope'))).rejects.toThrow('NOT_FOUND');
  });
});
