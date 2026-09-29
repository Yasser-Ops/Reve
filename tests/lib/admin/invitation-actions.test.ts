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

import { saveContent, updateSlug } from '@/lib/admin/invitation-actions';

const INV = '22222222-2222-4222-8222-222222222222';

function form(fields: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

beforeEach(() => {
  state.fake = null;
});

describe('saveContent', () => {
  it('saves nothing and lists what is wrong', async () => {
    state.fake = fakeSupabase({ invitations: [{ data: { id: INV, template_slug: 'lin' } }] });

    const result = await saveContent(
      null,
      form({ invitationId: INV, content: '{"initials":"MAYAK"}' }),
    );

    expect(result).toMatchObject({ ok: false });
    expect(result.ok ? [] : (result.issues ?? []).length).toBeGreaterThan(0);
    expect(state.fake.find('invitations', 'update')).toBeUndefined();
  });

  it('stores the parsed content', async () => {
    state.fake = fakeSupabase({
      invitations: [{ data: { id: INV, template_slug: 'lin' } }, { data: null }],
    });
    const content = {
      coupleFirstName: 'Maya',
      couplePartnerName: 'Karim',
      initials: 'MK',
      eventDate: '2027-06-12T17:00:00.000Z',
      venue: { name: 'Villa Rosa', addressLine: 'Broumana' },
    };

    await expect(
      saveContent(null, form({ invitationId: INV, content: JSON.stringify(content) })),
    ).resolves.toEqual({ ok: true });
    expect(state.fake.find('invitations', 'update')?.args[0]).toMatchObject({
      content: { ...content, schedule: [], gallery: [] },
    });
  });
});

describe('updateSlug', () => {
  it('refuses to move a link that has already been published', async () => {
    state.fake = fakeSupabase({
      invitations: [{ data: { id: INV, published_at: '2026-10-01T00:00:00Z' } }],
    });

    await expect(updateSlug(null, form({ invitationId: INV, slug: 'maya-karim' }))).resolves.toEqual(
      {
        ok: false,
        message: 'This invitation has been published: its link is already with guests.',
      },
    );
  });

  it('explains a link that is taken', async () => {
    state.fake = fakeSupabase({
      invitations: [{ data: { id: INV, published_at: null } }, { error: { code: '23505' } }],
    });

    await expect(updateSlug(null, form({ invitationId: INV, slug: 'maya-karim' }))).resolves.toEqual(
      { ok: false, message: 'Another invitation already uses that link.' },
    );
  });
});
