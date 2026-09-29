import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeSupabase } from '../../helpers/fake-supabase';

const { state } = vi.hoisted(() => ({
  state: { fake: null as ReturnType<typeof fakeSupabase> | null },
}));
vi.mock('next/cache', () => ({ revalidatePath: () => {} }));
vi.mock('@/lib/auth/guards', () => ({
  requireAdmin: async () => ({ userId: 'admin-1', email: 'ops@reve.lb' }),
}));
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => state.fake?.client }));

import { approveOnBehalf, publishInvitation } from '@/lib/admin/invitation-actions';
import { PUBLISH_BLOCK } from '@/lib/invitations/publish-guard';

const INV = '22222222-2222-4222-8222-222222222222';
const content = { coupleFirstName: 'Maya' };

function form(fields: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

function invitation(reviews: unknown[], orderStatus = 'review', stored: unknown = content) {
  return {
    data: {
      id: INV,
      content: stored,
      published_at: null,
      orders: { id: 'order-1', status: orderStatus, client_id: 'c' },
      invitation_reviews: reviews,
    },
  };
}

const approved = (snapshot: unknown) => ({
  decision: 'approved',
  content_snapshot: snapshot,
  created_at: '2026-10-01T00:00:00Z',
});

beforeEach(() => {
  state.fake = null;
});

describe('publishInvitation', () => {
  it('refuses without an approval', async () => {
    state.fake = fakeSupabase({ invitations: [invitation([])] });

    await expect(publishInvitation(null, form({ invitationId: INV }))).resolves.toEqual({
      ok: false,
      message: PUBLISH_BLOCK.NO_APPROVAL,
    });
    expect(state.fake.find('invitations', 'update')).toBeUndefined();
  });

  /* Review Focus 1, through the action. */
  it('refuses content edited after approval', async () => {
    state.fake = fakeSupabase({
      invitations: [invitation([approved({ coupleFirstName: 'Mayya' })])],
    });

    await expect(publishInvitation(null, form({ invitationId: INV }))).resolves.toEqual({
      ok: false,
      message: PUBLISH_BLOCK.CONTENT_CHANGED,
    });
  });

  it('refuses while the order is not awaiting approval', async () => {
    state.fake = fakeSupabase({
      invitations: [invitation([approved(content)], 'in_design')],
    });

    await expect(publishInvitation(null, form({ invitationId: INV }))).resolves.toMatchObject({
      ok: false,
    });
  });

  it('publishes exactly what was approved and delivers the order', async () => {
    state.fake = fakeSupabase({
      invitations: [invitation([approved(content)]), { data: null }],
      orders: [{ data: null }],
    });

    await expect(publishInvitation(null, form({ invitationId: INV }))).resolves.toEqual({
      ok: true,
    });
    expect(state.fake.find('invitations', 'update')?.args[0]).toMatchObject({
      status: 'published',
    });
    expect(state.fake.find('orders', 'update')?.args[0]).toMatchObject({ status: 'delivered' });
  });
});

/* Review fix: the live page serves the APPROVED snapshot, never the working
   content. An edit made after approval (or racing the publish) stays a draft. */
describe('what goes live', () => {
  it('publishes the approved snapshot into the live column', async () => {
    const snapshot = { coupleFirstName: 'Maya', initials: 'MK' };
    state.fake = fakeSupabase({
      invitations: [invitation([approved(snapshot)], 'review', { initials: 'MK', coupleFirstName: 'Maya' }), { data: null }],
      orders: [{ data: null }],
    });

    await expect(publishInvitation(null, form({ invitationId: INV }))).resolves.toEqual({ ok: true });
    const update = state.fake.find('invitations', 'update');
    expect(update?.args[0]).toMatchObject({ status: 'published', published_content: snapshot });
  });

  it('re-publishes a delivered invitation after a fresh approval', async () => {
    state.fake = fakeSupabase({
      invitations: [invitation([approved(content)], 'delivered'), { data: null }],
      orders: [{ data: null }],
    });

    await expect(publishInvitation(null, form({ invitationId: INV }))).resolves.toEqual({ ok: true });
  });
});

describe('approveOnBehalf', () => {
  it("records the current content as approved on the client's behalf", async () => {
    state.fake = fakeSupabase({
      invitations: [{ data: { id: INV, content } }],
      invitation_reviews: [{ data: null }],
    });

    await expect(
      approveOnBehalf(null, form({ invitationId: INV, note: 'Approved on WhatsApp 1 Oct' })),
    ).resolves.toEqual({ ok: true });
    expect(state.fake.find('invitation_reviews', 'insert')?.args[0]).toEqual({
      invitation_id: INV,
      decision: 'approved',
      content_snapshot: content,
      on_behalf: true,
      note: 'Approved on WhatsApp 1 Oct',
    });
  });
});
