import { createEvent, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { RSVP_NOT_OPEN } from '@/components/invitation/rsvp';
import { RsvpForm as JardinRsvpForm } from '@/components/invitation/templates/jardin/RsvpForm';
import { RsvpForm as LinRsvpForm } from '@/components/invitation/templates/lin/RsvpForm';

/**
 * A plain form GETs its own URL on submit, which reloaded the invitation and
 * replayed the envelope. Replies are not stored yet, so the form must stay on
 * the page and must never claim a reply was received.
 */
describe.each([
  ['Lin', LinRsvpForm, 'Submit'],
  ['Jardin', JardinRsvpForm, 'Send word'],
])('%s RsvpForm', (_name, RsvpForm, label) => {
  const renderForm = () => render(<RsvpForm accent="#8a6d3a" ink="#3a2f22" paper="#f5f0e6" />);

  it('does not navigate on submit', () => {
    renderForm();
    const form = screen.getByRole('form', { name: 'Reply' });
    const submit = createEvent.submit(form);

    fireEvent(form, submit);

    expect(submit.defaultPrevented).toBe(true);
  });

  it('says replies are not open yet after a submit, and nothing before', async () => {
    renderForm();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();

    await userEvent.setup().click(screen.getByRole('button', { name: label }));

    expect(screen.getByRole('status')).toHaveTextContent(RSVP_NOT_OPEN);
  });
});
