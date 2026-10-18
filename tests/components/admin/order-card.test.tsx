import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/components/admin/OrderLive', () => ({
  OrderLive: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));
vi.mock('@/components/admin/ActionForm', () => ({ ActionForm: () => null }));
vi.mock('@/lib/admin/order-actions', () => ({ provisionInvitation: vi.fn() }));

import { OrderCard } from '@/components/admin/OrderCard';
import type { ClientDetail } from '@/lib/admin/clients';

type Order = ClientDetail['orders'][number];
type Review = { decision: string; created_at: string; on_behalf: boolean };

function order(reviews: Review[]): Order {
  return {
    id: 'o1',
    reference: 'R-1',
    tier: 'signature',
    status: 'review',
    amount: 100,
    due_at: null,
    invitations: {
      id: 'i1',
      slug: 'maya',
      status: 'draft',
      template_slug: 'lin',
      invitation_reviews: reviews,
    },
  } as unknown as Order;
}

describe('OrderCard review line', () => {
  it('shows the newest decision with its date', () => {
    render(
      <OrderCard
        order={order([
          { decision: 'approved', created_at: '2026-10-02T10:00:00+00:00', on_behalf: false },
          {
            decision: 'changes_requested',
            created_at: '2026-10-01T10:00:00+00:00',
            on_behalf: false,
          },
        ])}
      />,
    );
    expect(screen.getByText('Client approved on 2 Oct 2026')).toBeInTheDocument();
  });

  it('notes a decision recorded on the client behalf', () => {
    render(
      <OrderCard
        order={order([
          {
            decision: 'changes_requested',
            created_at: '2026-10-02T10:00:00+00:00',
            on_behalf: true,
          },
        ])}
      />,
    );
    expect(
      screen.getByText('Client asked for changes on 2 Oct 2026 (recorded by Rêve)'),
    ).toBeInTheDocument();
  });

  it('shows nothing without a review', () => {
    render(<OrderCard order={order([])} />);
    expect(screen.queryByText(/^Client /)).not.toBeInTheDocument();
  });
});
