import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { OrderPanel } from '@/components/portal/OrderPanel';
import type { PortalOrder } from '@/lib/portal/orders';
import { portalRoutes, publicRoutes } from '@/lib/routes';
import { SITE_URL } from '@/lib/site';

const invitation: NonNullable<PortalOrder['invitation']> = {
  id: 'inv-1',
  slug: 'maya-and-omar',
  status: 'draft',
  templateSlug: 'lin',
  entitlements: { rsvp: true, portal: true, gallery: true },
  content: { coupleFirstName: 'Maya' },
  latestReview: null,
};

function order(overrides: Partial<PortalOrder> = {}): PortalOrder {
  return {
    id: 'o1',
    reference: 'REV-0001',
    tier: 'managed',
    status: 'in_design',
    invitation,
    ...overrides,
  };
}

describe('OrderPanel by stage', () => {
  it.each([
    ['paid', 'Payment received'],
    ['brief', 'Gathering your brief'],
    ['concept', 'Drawing your concept'],
    ['in_design', 'We are setting your invitation'],
  ] as const)('says we are working on it while %s', (status, label) => {
    render(<OrderPanel order={order({ status, tier: 'custom' })} />);
    expect(screen.getByText(label)).toBeInTheDocument();
    expect(screen.getByText('We are working on it.')).toBeInTheDocument();
  });

  it('links to the preview while in review, with no approval buttons here', () => {
    render(<OrderPanel order={order({ status: 'review' })} />);
    expect(screen.getByRole('link', { name: 'See your invitation' })).toHaveAttribute(
      'href',
      portalRoutes.preview('inv-1'),
    );
    expect(screen.queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Request changes' })).not.toBeInTheDocument();
  });

  it('shows the latest decision while in review', () => {
    render(
      <OrderPanel
        order={order({
          status: 'review',
          invitation: {
            ...invitation,
            latestReview: {
              decision: 'changes_requested',
              note: 'Move the date',
              createdAt: '2026-10-01T10:00:00Z',
            },
          },
        })}
      />,
    );
    expect(
      screen.getByText('You asked for changes on 1 Oct 2026: Move the date'),
    ).toBeInTheDocument();
  });

  it('gives the live link once delivered', () => {
    render(<OrderPanel order={order({ status: 'delivered' })} />);
    expect(screen.getByDisplayValue(`${SITE_URL}${publicRoutes.invitation('maya-and-omar')}`)).toBeInTheDocument();
  });

  it('asks for payment over WhatsApp, carrying the reference', () => {
    render(<OrderPanel order={order({ status: 'pending_payment', invitation: null })} />);
    const link = screen.getByRole('link', { name: /WhatsApp/ });
    expect(link.getAttribute('href')).toContain('wa.me');
    expect(decodeURIComponent(link.getAttribute('href') ?? '')).toContain('REV-0001');
    expect(screen.getByText('Awaiting payment')).toBeInTheDocument();
  });

  it('renders each order with its own reference', () => {
    render(
      <>
        <OrderPanel order={order({ id: 'a', reference: 'REV-AAAA' })} />
        <OrderPanel order={order({ id: 'b', reference: 'REV-BBBB' })} />
      </>,
    );
    expect(screen.getAllByRole('article')).toHaveLength(2);
    expect(screen.getByText('Order REV-AAAA')).toBeInTheDocument();
    expect(screen.getByText('Order REV-BBBB')).toBeInTheDocument();
  });
});

describe('OrderPanel checklist', () => {
  it('ticks what the invitation already holds, before review', () => {
    render(<OrderPanel order={order({ status: 'in_design' })} />);
    const list = screen.getByRole('list', { name: 'What we need from you' });
    const first = within(list).getByText(/first name/i).closest('li');
    expect(first).toHaveAttribute('data-done', 'true');
    const venue = within(list).getByText(/venue/i).closest('li');
    expect(venue).toHaveAttribute('data-done', 'false');
  });

  it('is absent from review onwards', () => {
    render(<OrderPanel order={order({ status: 'review' })} />);
    expect(screen.queryByRole('list', { name: 'What we need from you' })).not.toBeInTheDocument();
  });

  it('is absent before there is an invitation', () => {
    render(<OrderPanel order={order({ status: 'paid', invitation: null })} />);
    expect(screen.queryByRole('list', { name: 'What we need from you' })).not.toBeInTheDocument();
  });

  it('is skipped, without crashing, for a design the registry does not know', () => {
    render(
      <OrderPanel
        order={order({ invitation: { ...invitation, templateSlug: 'retired-design' } })}
      />,
    );
    expect(screen.queryByRole('list', { name: 'What we need from you' })).not.toBeInTheDocument();
    expect(screen.getByRole('article')).toBeInTheDocument();
  });
});

describe('OrderPanel guest list', () => {
  it('locks the card on Basic with an upgrade link carrying the reference', () => {
    render(<OrderPanel order={order({
          tier: 'basic',
          invitation: { ...invitation, entitlements: { rsvp: false, portal: false, gallery: true } },
        })} />);
    const upgrade = screen.getByRole('link', { name: 'Upgrade' });
    expect(decodeURIComponent(upgrade.getAttribute('href') ?? '')).toContain(
      'Hi, I would like to upgrade order REV-0001 to Managed.',
    );
  });

  it('shows the list and the export link for an entitled invitation', () => {
    render(
      <OrderPanel
        guestList={{
          guests: [
            {
              name: 'Layla',
              attending: true,
              partySize: 2,
              dietaryNotes: 'Vegan',
              message: null,
              repliedAt: '2026-10-02T10:00:00Z',
              earlierReplies: 0,
            },
          ],
          coming: 2,
          declined: 0,
          replies: 1,
        }}
        order={order({ tier: 'managed' })}
      />,
    );
    expect(screen.getByText('Layla')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Download CSV' })).toHaveAttribute(
      'href',
      portalRoutes.guestsExport('inv-1'),
    );
    expect(screen.queryByRole('link', { name: 'Upgrade' })).not.toBeInTheDocument();
  });

  it('shows the empty state before anyone has replied', () => {
    render(
      <OrderPanel guestList={{ guests: [], coming: 0, declined: 0, replies: 0 }} order={order()} />,
    );
    expect(
      screen.getByText('No replies yet. They appear here as guests answer.'),
    ).toBeInTheDocument();
  });

  it('gates on the snapshot of what was bought, not on the tier', () => {
    render(
      <OrderPanel
        order={order({
          tier: 'managed',
          invitation: { ...invitation, entitlements: { rsvp: false, portal: true, gallery: true } },
        })}
      />,
    );
    expect(screen.getByRole('link', { name: 'Upgrade' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Download CSV' })).not.toBeInTheDocument();
  });

  it('keeps the placeholder while an entitled order has no invitation yet', () => {
    render(<OrderPanel order={order({ tier: 'managed', status: 'paid', invitation: null })} />);
    expect(screen.getByText('Your guest list opens here soon.')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Upgrade' })).not.toBeInTheDocument();
  });
});
