import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { submitReview } = vi.hoisted(() => ({ submitReview: vi.fn() }));
vi.mock('@/lib/portal/review-actions', () => ({ submitReview }));

import { ReviewForm } from '@/components/portal/ReviewForm';

beforeEach(() => submitReview.mockReset());

describe('ReviewForm', () => {
  it('offers approve and request changes, with the note hidden', () => {
    render(<ReviewForm invitationId="inv-1" latestReview={null} />);
    expect(screen.getByRole('button', { name: 'Approve' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Request changes' })).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('request changes reveals the note field', () => {
    render(<ReviewForm invitationId="inv-1" latestReview={null} />);
    fireEvent.click(screen.getByRole('button', { name: 'Request changes' }));
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('thanks the client for an approval', async () => {
    submitReview.mockResolvedValue({ ok: true });
    render(<ReviewForm invitationId="inv-1" latestReview={null} />);
    fireEvent.click(screen.getByRole('button', { name: 'Approve' }));

    expect(await screen.findByText('Thank you. We have your approval.')).toBeInTheDocument();
    const sent = submitReview.mock.calls[0][1] as FormData;
    expect(sent.get('decision')).toBe('approved');
    expect(sent.get('invitationId')).toBe('inv-1');
  });

  it('thanks the client for a request for changes', async () => {
    submitReview.mockResolvedValue({ ok: true });
    render(<ReviewForm invitationId="inv-1" latestReview={null} />);
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
    render(<ReviewForm invitationId="inv-1" latestReview={null} />);
    fireEvent.click(screen.getByRole('button', { name: 'Request changes' }));
    fireEvent.click(screen.getByRole('button', { name: 'Send my changes' }));

    await waitFor(() => expect(screen.getByText('Tell us what to change.')).toBeInTheDocument());
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('shows the latest decision above the buttons', () => {
    render(
      <ReviewForm
        invitationId="inv-1"
        latestReview={{
          decision: 'changes_requested',
          note: 'Move the date',
          createdAt: '2026-10-01T10:00:00Z',
        }}
      />,
    );
    expect(screen.getByText(/You asked for changes/)).toBeInTheDocument();
    expect(screen.getByText(/Move the date/)).toBeInTheDocument();
  });
});
