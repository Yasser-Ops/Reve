import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/components/store/LiveInvitationDemo', () => ({
  LiveInvitationDemo: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="phone">{children}</div>
  ),
}));

import { PreviewViews } from '@/components/portal/PreviewViews';
import type { PreviewView } from '@/lib/routes';

function renderViews(requested: PreviewView | null) {
  return render(
    <PreviewViews requested={requested} templateSlug="lin" wideGuess>
      <p>the design</p>
    </PreviewViews>,
  );
}

function stubViewport(wide: boolean) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: wide,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
}

afterEach(() => {
  window.history.replaceState(null, '', '/');
  vi.unstubAllGlobals();
});

describe('PreviewViews', () => {
  it('opens in the phone on a wide viewport when the URL chooses nothing', () => {
    stubViewport(true);
    renderViews(null);
    expect(screen.getByTestId('phone')).toHaveTextContent('the design');
  });

  it('opens full screen on a phone when the URL chooses nothing', () => {
    stubViewport(false);
    renderViews(null);
    expect(screen.queryByTestId('phone')).not.toBeInTheDocument();
    expect(screen.getByText('the design')).toBeInTheDocument();
  });

  it('follows the URL over the viewport', () => {
    stubViewport(false);
    renderViews('phone');
    expect(screen.getByTestId('phone')).toBeInTheDocument();
  });

  it('switches view and writes it to ?view= without navigating', () => {
    stubViewport(true);
    window.history.replaceState(null, '', '/portal/preview/abc?keep=1');
    renderViews(null);

    fireEvent.click(screen.getByRole('button', { name: 'Full screen' }));

    expect(screen.queryByTestId('phone')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Full screen' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(window.location.pathname).toBe('/portal/preview/abc');
    expect(new URLSearchParams(window.location.search).get('view')).toBe('full');
    expect(new URLSearchParams(window.location.search).get('keep')).toBe('1');
  });
});
