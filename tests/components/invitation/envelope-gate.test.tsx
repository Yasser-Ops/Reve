import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { EnvelopeGate } from '@/components/invitation/EnvelopeGate';

beforeEach(() => {
  window.localStorage.clear();
});

function renderGate() {
  return render(
    <EnvelopeGate initials="SA" slug="sarah-and-amine">
      <p>Invitation body</p>
    </EnvelopeGate>,
  );
}

describe('EnvelopeGate', () => {
  it('shows the sealed envelope on a first visit', async () => {
    renderGate();
    expect(await screen.findByRole('button', { name: /open/i })).toBeInTheDocument();
  });

  it('shows the couple initials on the seal', async () => {
    renderGate();
    expect(await screen.findByText('SA')).toBeInTheDocument();
  });

  it('reveals the invitation after the seal is tapped', async () => {
    const user = userEvent.setup();
    renderGate();

    await user.click(await screen.findByRole('button', { name: /open/i }));

    expect(screen.getByText('Invitation body')).toBeInTheDocument();
  });

  it('records the opening so a return visit skips the envelope', async () => {
    const user = userEvent.setup();
    const first = renderGate();

    await user.click(await screen.findByRole('button', { name: /open/i }));
    first.unmount();

    renderGate();
    expect(await screen.findByText('Invitation body')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /open/i })).not.toBeInTheDocument();
  });
});
