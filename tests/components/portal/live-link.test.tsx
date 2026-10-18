import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LiveLink } from '@/components/portal/LiveLink';

const URL_TO_SHARE = 'https://example.com/i/maya-and-omar';

beforeEach(() => {
  vi.useFakeTimers();
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText: vi.fn().mockResolvedValue(undefined) },
  });
});

afterEach(() => vi.useRealTimers());

describe('LiveLink', () => {
  it('shows Copied after copying and reverts after two seconds', async () => {
    render(<LiveLink url={URL_TO_SHARE} />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Copy' }));
    });
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(URL_TO_SHARE);
    expect(screen.getByRole('button', { name: 'Copied' })).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(screen.getByRole('button', { name: 'Copy' })).toBeInTheDocument();
  });

  it('shares the link on WhatsApp', () => {
    render(<LiveLink url={URL_TO_SHARE} />);
    expect(screen.getByRole('link', { name: 'Share on WhatsApp' })).toHaveAttribute(
      'href',
      `https://wa.me/?text=${encodeURIComponent(URL_TO_SHARE)}`,
    );
  });
});
