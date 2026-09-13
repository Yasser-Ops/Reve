import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { EnvelopeGate } from '@/components/invitation/EnvelopeGate';

function renderGate(props: { contained?: boolean } = {}) {
  return render(
    <EnvelopeGate initials="SA" {...props}>
      <p>Invitation body</p>
    </EnvelopeGate>,
  );
}

describe('EnvelopeGate', () => {
  it('shows the sealed envelope', async () => {
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

  /* The ceremony is the product, and a guest who returns is usually showing
     someone else. It replays every time rather than once per device. */
  it('plays again on a return visit', async () => {
    const user = userEvent.setup();
    const first = renderGate();

    await user.click(await screen.findByRole('button', { name: /open/i }));
    first.unmount();

    renderGate();
    expect(
      await screen.findByRole('button', { name: /open/i }),
    ).toBeInTheDocument();
  });

  /* Replaying is only acceptable because there is always a way past it. */
  it('lets a returning guest skip straight to the invitation', async () => {
    const user = userEvent.setup();
    renderGate();

    await user.click(await screen.findByRole('button', { name: /skip/i }));

    expect(screen.getByText('Invitation body')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /open/i })).not.toBeInTheDocument();
  });

  /* A sequence that fetches as it plays stutters partway through the opening,
     which is the one moment of the product a guest actually remembers. The
     seal must not respond until every frame is decoded. */
  it('holds the seal inert until the frames are decoded', () => {
    renderGate();

    expect(screen.getByRole('button', { name: /open/i })).toBeDisabled();
    expect(screen.getByText('One moment')).toBeInTheDocument();
  });

  it('arms the seal once the frames are decoded', async () => {
    renderGate();

    expect(await screen.findByText('Tap the seal')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /open/i })).toBeEnabled();
  });

  /* Frame 1 is the sealed envelope and paints before anything else loads, so
     the gate never shows an empty rectangle while the rest arrives. */
  it('paints the sealed frame first', () => {
    const { container } = renderGate();

    expect(container.querySelector('.envelope-frame')).toHaveAttribute(
      'src',
      '/envelope/lin/frames/0001.webp',
    );
  });

  it('locks the page behind a full-screen envelope', async () => {
    renderGate();
    await screen.findByRole('button', { name: /open/i });

    expect(document.body.style.overflow).toBe('hidden');
  });

  /* A demo plays inside a frame on a page the visitor is still reading, so it
     must never take the scroll away from them. */
  it('leaves the page scrollable when contained', async () => {
    renderGate({ contained: true });
    await screen.findByRole('button', { name: /open/i });

    expect(document.body.style.overflow).not.toBe('hidden');
  });
});
