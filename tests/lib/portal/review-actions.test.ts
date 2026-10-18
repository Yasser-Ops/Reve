import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeSupabase } from '../../helpers/fake-supabase';

const { state, revalidated } = vi.hoisted(() => ({
  state: { fake: null as ReturnType<typeof fakeSupabase> | null },
  revalidated: [] as string[],
}));
vi.mock('next/cache', () => ({ revalidatePath: (path: string) => revalidated.push(path) }));
vi.mock('@/lib/auth/guards', () => ({
  requireClient: async () => ({ userId: 'user-1', clientId: 'client-1' }),
}));
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => state.fake?.client }));

import { UNEXPECTED } from '@/lib/admin/action-result';
import { contentFingerprint } from '@/lib/invitations/publish-guard';
import { REVIEW_MESSAGES } from '@/lib/portal/messages';
import { submitReview } from '@/lib/portal/review-actions';
import { ROUTES, adminRoutes } from '@/lib/routes';

const INV = '22222222-2222-4222-8222-222222222222';
const content = { coupleFirstName: 'Maya' };
const fingerprint = contentFingerprint(content);

function form(fields: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

beforeEach(() => {
  state.fake = null;
  revalidated.length = 0;
});

describe('submitReview', () => {
  it('approving inserts the current content as the snapshot', async () => {
    state.fake = fakeSupabase({ invitations: [{ data: { id: INV, content } }] });

    await expect(
      submitReview(null, form({ invitationId: INV, fingerprint, decision: 'approved' })),
    ).resolves.toEqual({ ok: true });

    expect(state.fake.find('invitations', 'select')?.args).toEqual(['id, content']);
    expect(state.fake.find('invitation_reviews', 'insert')?.args).toEqual([
      { invitation_id: INV, decision: 'approved', note: '', content_snapshot: content },
    ]);
    expect(revalidated).toEqual([ROUTES.PORTAL, adminRoutes.invitation(INV)]);
  });

  it('records the note with a request for changes', async () => {
    state.fake = fakeSupabase({ invitations: [{ data: { id: INV, content } }] });

    await submitReview(
      null,
      form({ invitationId: INV, fingerprint, decision: 'changes_requested', note: '  Move the date  ' }),
    );

    expect(state.fake.find('invitation_reviews', 'insert')?.args).toEqual([
      {
        invitation_id: INV,
        decision: 'changes_requested',
        note: 'Move the date',
        content_snapshot: content,
      },
    ]);
  });

  it('an RLS refusal reads as the draft changing', async () => {
    state.fake = fakeSupabase({
      invitations: [{ data: { id: INV, content } }],
      invitation_reviews: [{ error: { code: '42501' } }],
    });

    await expect(
      submitReview(null, form({ invitationId: INV, fingerprint, decision: 'approved' })),
    ).resolves.toEqual({ ok: false, message: REVIEW_MESSAGES.DRAFT_CHANGED });
    expect(REVIEW_MESSAGES.DRAFT_CHANGED).toBe(
      'This draft just changed. Reload to see the latest.',
    );
    expect(revalidated).toEqual([]);
  });

  it('changes without a note is refused', async () => {
    state.fake = fakeSupabase({ invitations: [{ data: { id: INV, content } }] });

    await expect(
      submitReview(null, form({ invitationId: INV, fingerprint, decision: 'changes_requested', note: '   ' })),
    ).resolves.toEqual({ ok: false, message: 'Tell us what to change.' });
    expect(state.fake.find('invitation_reviews', 'insert')).toBeUndefined();
  });

  it('a fingerprint of older content is refused without an insert', async () => {
    state.fake = fakeSupabase({ invitations: [{ data: { id: INV, content } }] });

    await expect(
      submitReview(
        null,
        form({
          invitationId: INV,
          fingerprint: contentFingerprint({ coupleFirstName: 'Mayya' }),
          decision: 'approved',
        }),
      ),
    ).resolves.toEqual({ ok: false, message: REVIEW_MESSAGES.DRAFT_CHANGED });
    expect(state.fake.find('invitation_reviews', 'insert')).toBeUndefined();
    expect(revalidated).toEqual([]);
  });

  it('refuses a missing fingerprint', async () => {
    state.fake = fakeSupabase();

    await expect(
      submitReview(null, form({ invitationId: INV, decision: 'approved' })),
    ).resolves.toEqual({ ok: false, message: UNEXPECTED });
  });

  it('refuses a note over 1000 characters', async () => {
    state.fake = fakeSupabase({ invitations: [{ data: { id: INV, content } }] });

    const result = await submitReview(
      null,
      form({ invitationId: INV, fingerprint, decision: 'changes_requested', note: 'x'.repeat(1001) }),
    );

    expect(result.ok).toBe(false);
    expect(state.fake.find('invitation_reviews', 'insert')).toBeUndefined();
  });

  it('refuses an unknown decision', async () => {
    state.fake = fakeSupabase();

    await expect(
      submitReview(null, form({ invitationId: INV, fingerprint, decision: 'published' })),
    ).resolves.toEqual({ ok: false, message: UNEXPECTED });
  });

  it('an invitation the client cannot read is unexpected', async () => {
    state.fake = fakeSupabase({ invitations: [{ data: null }] });

    await expect(
      submitReview(null, form({ invitationId: INV, fingerprint, decision: 'approved' })),
    ).resolves.toEqual({ ok: false, message: UNEXPECTED });
  });
});
