import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ActionResult } from '@/lib/admin/action-result';

/* moveOrder answers only when the test says so, so the test can look at the
   screen while the save is still in flight. */
const { pending } = vi.hoisted(() => ({
  pending: { resolve: null as ((result: ActionResult) => void) | null },
}));
vi.mock('@/lib/admin/order-actions', () => ({
  moveOrder: () =>
    new Promise<ActionResult>((resolve) => {
      pending.resolve = resolve;
    }),
  applyUpgrade: async () => ({ ok: true }),
}));

import { OrderLive } from '@/components/admin/OrderLive';

function renderOrder() {
  return render(
    <OrderLive
      amount={250}
      dueLabel={null}
      orderId="11111111-1111-4111-8111-111111111111"
      reference="RV-0009"
      status="paid"
      tier="managed"
      upgrades={[]}
    >
      <p>server children</p>
    </OrderLive>,
  );
}

const stage = () => screen.getByText(/Paid|In design/, { selector: '[data-status]' });

describe('OrderLive', () => {
  it('shows the next stage the moment the move is clicked', async () => {
    renderOrder();
    fireEvent.click(screen.getByRole('button', { name: 'Move to In design' }));

    await waitFor(() => expect(stage()).toHaveAttribute('data-status', 'in_design'));
    expect(pending.resolve).not.toBeNull();
    pending.resolve?.({ ok: true });
  });

  it('puts the stage back and says why when the server refuses', async () => {
    renderOrder();
    fireEvent.click(screen.getByRole('button', { name: 'Move to In design' }));
    await waitFor(() => expect(stage()).toHaveAttribute('data-status', 'in_design'));

    pending.resolve?.({ ok: false, message: 'That order cannot move to that stage from here.' });

    await waitFor(() => expect(stage()).toHaveAttribute('data-status', 'paid'));
    expect(screen.getByText('That order cannot move to that stage from here.')).toBeInTheDocument();
  });

  /* Second review: the last refusal stayed up while the next move ran. */
  it('clears the last refusal as soon as the next move starts', async () => {
    renderOrder();
    fireEvent.click(screen.getByRole('button', { name: 'Move to In design' }));
    await waitFor(() => expect(stage()).toHaveAttribute('data-status', 'in_design'));
    pending.resolve?.({ ok: false, message: 'Refused once.' });
    await waitFor(() => expect(screen.getByText('Refused once.')).toBeInTheDocument());
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Move to In design' })).toBeEnabled(),
    );

    fireEvent.click(screen.getByRole('button', { name: 'Move to In design' }));
    await waitFor(() => expect(stage()).toHaveAttribute('data-status', 'in_design'));
    expect(screen.queryByText('Refused once.')).toBeNull();
    pending.resolve?.({ ok: true });
  });

  it('keeps the server-rendered parts of the card', () => {
    renderOrder();
    expect(screen.getByText('server children')).toBeInTheDocument();
  });
});
