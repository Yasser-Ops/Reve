import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ReveCredit, creditHref } from '@/components/invitation/ReveCredit';

describe('ReveCredit', () => {
  it('tags the visit with the wedding that sent it', () => {
    const url = new URL(creditHref('sarah-and-amine'), 'https://example.test');

    expect(url.pathname).toBe('/');
    expect(url.searchParams.get('utm_source')).toBe('invitation');
    expect(url.searchParams.get('utm_medium')).toBe('credit');
    expect(url.searchParams.get('utm_campaign')).toBe('sarah-and-amine');
  });

  /* A guest following the credit must not lose the invitation behind it. */
  it('opens the storefront in a new tab', () => {
    render(<ReveCredit slug="sarah-and-amine" />);
    const link = screen.getByRole('link', { name: /designed by rêve/i });

    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('href', creditHref('sarah-and-amine'));
  });
});
