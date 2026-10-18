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
/* A desktop browser, so the server's first guess is the phone. */
vi.mock('next/headers', () => ({
  headers: async () =>
    new Headers({
      'user-agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36',
    }),
}));
/* The phone itself is the store's and tested there: the stand-in marks it. */
vi.mock('@/components/store/LiveInvitationDemo', () => ({
  LiveInvitationDemo: ({ envelope, children }: { envelope: string; children: React.ReactNode }) => (
    <div data-envelope={envelope} data-testid="phone">
      {children}
    </div>
  ),
}));
vi.mock('@/lib/supabase/server', () => ({ createClient }));
/* Realtime is not under test here: the stand-in records what it watches. */
vi.mock('@/components/LiveRefresh', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/components/LiveRefresh')>()),
  LiveRefresh: ({ tables }: { tables: readonly string[] }) => (
    <div data-live={[...tables].sort().join(',')} data-testid="live-refresh" />
  ),
}));

/* The design itself is not under test here: stand-ins record their props. */
vi.mock('@/components/invitation/DraftRender', () => ({
  DraftRender: ({ content }: { content: unknown }) => {
    rendered.content = content;
    return <p>the design</p>;
  },
}));
vi.mock('@/components/portal/ReviewForm', () => ({
  REVIEW_BAR_SPACE: 120,
  ReviewForm: ({
    fingerprint,
    invitationId,
    latest,
  }: {
    fingerprint: string;
    invitationId: string;
    latest: unknown;
  }) => (
    <form
      aria-label="Your review"
      data-fingerprint={fingerprint}
      data-invitation={invitationId}
      data-latest={JSON.stringify(latest)}
    />
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
const params = (id: string, view?: string) => ({
  params: Promise.resolve({ id }),
  searchParams: Promise.resolve(view === undefined ? {} : { view }),
});

function invitationRow(
  status: string,
  content: unknown = { complete: true, couple: 'Maya' },
  invitation_reviews: unknown[] = [],
) {
  return {
    data: {
      id: INV,
      template_slug: 'lin',
      content,
      theme: {},
      entitlements: {},
      orders: { status },
      invitation_reviews,
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

  const review = (decision: string, created_at: string, content_snapshot: unknown) => ({
    decision,
    note: decision,
    created_at,
    content_snapshot,
  });
  const latestOf = () =>
    JSON.parse(screen.getByRole('form', { name: 'Your review' }).getAttribute('data-latest') ?? 'null');

  it('hands the form the newest review, current when the content is unchanged', async () => {
    const content = { complete: true, couple: 'Maya' };
    state.fake = fakeSupabase({
      invitations: [
        invitationRow('review', content, [
          review('changes_requested', '2026-10-01T10:00:00+00:00', content),
          review('approved', '2026-10-02T10:00:00+00:00', { ...content }),
        ]),
      ],
    });
    render(await PortalPreviewPage(params(INV)));

    expect(latestOf()).toEqual({
      decision: 'approved',
      createdAt: '2026-10-02T10:00:00+00:00',
      note: 'approved',
      current: true,
    });
  });

  it('marks the latest review not current once the content moved on', async () => {
    state.fake = fakeSupabase({
      invitations: [
        invitationRow('review', { complete: true, couple: 'Maya' }, [
          review('approved', '2026-10-02T10:00:00+00:00', { complete: true, couple: 'Old' }),
        ]),
      ],
    });
    render(await PortalPreviewPage(params(INV)));
    expect(latestOf().current).toBe(false);
  });

  it('passes no review when there is none', async () => {
    state.fake = fakeSupabase({ invitations: [invitationRow('review')] });
    render(await PortalPreviewPage(params(INV)));
    expect(latestOf()).toBeNull();
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

  it('refreshes live on order moves and review decisions', async () => {
    state.fake = fakeSupabase({ invitations: [invitationRow('review')] });
    render(await PortalPreviewPage(params(INV)));
    expect(screen.getByTestId('live-refresh')).toHaveAttribute(
      'data-live',
      'invitation_reviews,orders',
    );
  });

  describe('view', () => {
    it.each(['review', 'delivered'])('frames the design in the phone with ?view=phone (%s)', async (status) => {
      state.fake = fakeSupabase({ invitations: [invitationRow(status)] });
      render(await PortalPreviewPage(params(INV, 'phone')));

      const phone = screen.getByTestId('phone');
      expect(phone).toHaveAttribute('data-envelope', 'lin');
      expect(phone).toHaveTextContent('the design');
      expect(screen.getByRole('button', { name: 'Phone' })).toHaveAttribute('aria-pressed', 'true');
    });

    it('fills the window with ?view=full', async () => {
      state.fake = fakeSupabase({ invitations: [invitationRow('review')] });
      render(await PortalPreviewPage(params(INV, 'full')));

      expect(screen.queryByTestId('phone')).not.toBeInTheDocument();
      expect(screen.getByText('the design')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Full screen' })).toHaveAttribute(
        'aria-pressed',
        'true',
      );
    });

    it.each(['phone', 'full'])('keeps the review bar in review with ?view=%s', async (view) => {
      state.fake = fakeSupabase({ invitations: [invitationRow('review')] });
      render(await PortalPreviewPage(params(INV, view)));

      const form = screen.getByRole('form', { name: 'Your review' });
      expect(form).toHaveAttribute('data-fingerprint', contentFingerprint(rendered.content));
    });

    it('falls back to the viewport default for an unknown view', async () => {
      /* The test setup's matchMedia matches nothing: a phone-sized window. */
      state.fake = fakeSupabase({ invitations: [invitationRow('review')] });
      render(await PortalPreviewPage(params(INV, 'sideways')));

      expect(screen.queryByTestId('phone')).not.toBeInTheDocument();
      expect(screen.getByText('the design')).toBeInTheDocument();
    });

    it('offers no phone for a draft too incomplete to render', async () => {
      state.fake = fakeSupabase({ invitations: [invitationRow('review', { complete: false })] });
      render(await PortalPreviewPage(params(INV, 'phone')));

      expect(screen.queryByTestId('phone')).not.toBeInTheDocument();
      expect(screen.queryByRole('group', { name: 'View' })).not.toBeInTheDocument();
    });
  });
});
