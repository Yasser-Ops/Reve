import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { submitReview } = vi.hoisted(() => ({ submitReview: vi.fn() }));
vi.mock('@/lib/portal/review-actions', () => ({ submitReview }));

import { ReviewForm } from '@/components/portal/ReviewForm';
import { ROUTES } from '@/lib/routes';

const FP = 'a'.repeat(64);

type Latest = React.ComponentProps<typeof ReviewForm>['latest'];

function renderForm(latest: Latest = null) {
  return render(<ReviewForm fingerprint={FP} invitationId="inv-1" latest={latest} />);
}

beforeEach(() => submitReview.mockReset());

describe('ReviewForm', () => {
  it('offers approve and request changes, with the note hidden', () => {
    renderForm();
    expect(screen.getByRole('button', { name: 'Approve' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Request changes' })).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('request changes reveals the note field', () => {
    renderForm();
    fireEvent.click(screen.getByRole('button', { name: 'Request changes' }));
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('thanks the client for an approval', async () => {
    submitReview.mockResolvedValue({ ok: true });
    renderForm();
    fireEvent.click(screen.getByRole('button', { name: 'Approve' }));

    expect(await screen.findByText('Thank you. We have your approval.')).toBeInTheDocument();
    const sent = submitReview.mock.calls[0][1] as FormData;
    expect(sent.get('decision')).toBe('approved');
    expect(sent.get('invitationId')).toBe('inv-1');
    expect(sent.get('fingerprint')).toBe(FP);
  });

  it('thanks the client for a request for changes', async () => {
    submitReview.mockResolvedValue({ ok: true });
    renderForm();
    fireEvent.click(screen.getByRole('button', { name: 'Request changes' }));
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Move the date' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send my changes' }));

    expect(
      await screen.findByText('Thank you. We will be in touch on WhatsApp.'),
    ).toBeInTheDocument();
    const sent = submitReview.mock.calls[0][1] as FormData;
    expect(sent.get('decision')).toBe('changes_requested');
    expect(sent.get('note')).toBe('Move the date');
  });

  it('shows the refusal and keeps the form', async () => {
    submitReview.mockResolvedValue({ ok: false, message: 'Tell us what to change.' });
    renderForm();
    fireEvent.click(screen.getByRole('button', { name: 'Request changes' }));
    fireEvent.click(screen.getByRole('button', { name: 'Send my changes' }));

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('Tell us what to change.'),
    );
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('cancel hides the note field again', () => {
    renderForm();
    fireEvent.click(screen.getByRole('button', { name: 'Request changes' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Approve' })).toBeInTheDocument();
  });

  it('leads back to the dashboard', () => {
    renderForm();
    expect(screen.getByRole('link', { name: 'Back to your orders' })).toHaveAttribute(
      'href',
      ROUTES.PORTAL,
    );
  });
});

describe('ReviewForm with a previous decision', () => {
  const approved = {
    decision: 'approved' as const,
    createdAt: '2026-10-02T10:00:00+00:00',
    note: '',
    current: true,
  };

  it('approved and current: shows the date and only a withdraw button', () => {
    renderForm(approved);
    expect(screen.getByText('You approved this on 2 Oct 2026.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Withdraw approval' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Request changes' })).not.toBeInTheDocument();
  });

  it('withdrawing with no note sends the default note', async () => {
    submitReview.mockResolvedValue({ ok: true });
    renderForm(approved);
    fireEvent.click(screen.getByRole('button', { name: 'Withdraw approval' }));
    expect(screen.getByLabelText('What should we change?')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Confirm withdrawal' }));

    await waitFor(() => expect(submitReview).toHaveBeenCalled());
    const sent = submitReview.mock.calls[0][1] as FormData;
    expect(sent.get('decision')).toBe('changes_requested');
    expect(sent.get('note')).toBe('Approval withdrawn.');
    expect(await screen.findByRole('button', { name: 'Approve' })).toBeInTheDocument();
    expect(
      screen.getByText(/You asked for changes on .*: Approval withdrawn\./),
    ).toBeInTheDocument();
  });

  it('withdrawing keeps a note the client typed', async () => {
    submitReview.mockResolvedValue({ ok: true });
    renderForm(approved);
    fireEvent.click(screen.getByRole('button', { name: 'Withdraw approval' }));
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'New date' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirm withdrawal' }));

    await waitFor(() => expect(submitReview).toHaveBeenCalled());
    expect((submitReview.mock.calls[0][1] as FormData).get('note')).toBe('New date');
  });

  it('changes requested: shows the note and both buttons', () => {
    renderForm({
      decision: 'changes_requested',
      createdAt: '2026-10-02T10:00:00+00:00',
      note: 'Move the date',
      current: false,
    });
    expect(
      screen.getByText('You asked for changes on 2 Oct 2026: Move the date'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Approve' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Request changes' })).toBeInTheDocument();
  });

  it('approved but not current: asks the client to look again', () => {
    renderForm({ ...approved, current: false });
    expect(
      screen.getByText('We updated your invitation since you approved it. Please look again.'),
    ).toBeInTheDocument();
    expect(screen.queryByText(/You approved this on/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Approve' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Request changes' })).toBeInTheDocument();
  });

  it('after approving, swaps the buttons for the withdraw button', async () => {
    submitReview.mockResolvedValue({ ok: true });
    renderForm();
    fireEvent.click(screen.getByRole('button', { name: 'Approve' }));

    expect(await screen.findByRole('button', { name: 'Withdraw approval' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument();
  });
});
