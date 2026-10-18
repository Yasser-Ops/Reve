import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { fakeSupabase } from '../helpers/fake-supabase';

const { state, requireClient, createClient, rendered } = vi.hoisted(() => ({
  state: { fake: null as ReturnType<typeof fakeSupabase> | null },
  requireClient: vi.fn(async () => ({ clientId: 'client-1' })),
  createClient: vi.fn(async () => state.fake?.client),
  /** What the page handed the design, to compare with what it fingerprinted. */
  rendered: { content: undefined as unknown },
}));
vi.mock('next/navigation', () => ({
  notFound: (): never => {
    throw new Error('NOT_FOUND');
  },
}));
vi.mock('@/lib/auth/guards', () => ({ requireClient }));
vi.mock('@/lib/supabase/server', () => ({ createClient }));

/* The design itself is not under test here: stand-ins record their props. */
vi.mock('@/components/invitation/DraftRender', () => ({
  DraftRender: ({ content }: { content: unknown }) => {
    rendered.content = content;
    return <p>the design</p>;
  },
}));
vi.mock('@/components/portal/ReviewForm', () => ({
  REVIEW_BAR_SPACE: 120,
  ReviewForm: ({ fingerprint, invitationId }: { fingerprint: string; invitationId: string }) => (
    <form aria-label="Your review" data-fingerprint={fingerprint} data-invitation={invitationId} />
  ),
}));
vi.mock('@/components/invitation/registry', () => ({
  getTemplateEntry: (slug: string) =>
    slug === 'lin'
      ? {
          schema: {
            safeParse: (value: unknown) => ({
              success: (value as { complete?: boolean }).complete === true,
            }),
          },
        }
      : undefined,
}));

import PortalPreviewPage from '@/app/portal/preview/[id]/page';
import { contentFingerprint } from '@/lib/invitations/publish-guard';

const INV = '22222222-2222-4222-8222-222222222222';
const params = (id: string) => ({ params: Promise.resolve({ id }) });

function invitationRow(status: string, content: unknown = { complete: true, couple: 'Maya' }) {
  return {
    data: {
      id: INV,
      template_slug: 'lin',
      content,
      theme: {},
      entitlements: {},
      orders: { status },
    },
  };
}

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

  it.each(['pending_payment', 'paid', 'brief', 'concept', 'in_design', 'cancelled'])(
    'is not found while the order is %s',
    async (status) => {
      state.fake = fakeSupabase({ invitations: [invitationRow(status)] });
      await expect(PortalPreviewPage(params(INV))).rejects.toThrow('NOT_FOUND');
    },
  );

  it('is not found when RLS hides the order', async () => {
    state.fake = fakeSupabase({
      invitations: [{ data: { ...invitationRow('review').data, orders: null } }],
    });
    await expect(PortalPreviewPage(params(INV))).rejects.toThrow('NOT_FOUND');
  });

  it('in review, fingerprints exactly the content it rendered', async () => {
    state.fake = fakeSupabase({ invitations: [invitationRow('review')] });
    render(await PortalPreviewPage(params(INV)));

    const form = screen.getByRole('form', { name: 'Your review' });
    expect(rendered.content).toEqual({ complete: true, couple: 'Maya' });
    expect(form).toHaveAttribute('data-fingerprint', contentFingerprint(rendered.content));
    expect(form).toHaveAttribute('data-invitation', INV);
  });

  it('once delivered, shows the design without the review bar', async () => {
    state.fake = fakeSupabase({ invitations: [invitationRow('delivered')] });
    render(await PortalPreviewPage(params(INV)));

    expect(screen.getByText('the design')).toBeInTheDocument();
    expect(screen.queryByRole('form', { name: 'Your review' })).not.toBeInTheDocument();
  });

  it('offers no approval for a draft too incomplete to render', async () => {
    state.fake = fakeSupabase({ invitations: [invitationRow('review', { complete: false })] });
    render(await PortalPreviewPage(params(INV)));

    expect(screen.queryByRole('form', { name: 'Your review' })).not.toBeInTheDocument();
  });
});
