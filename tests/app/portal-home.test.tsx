import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/auth/guards', () => ({
  requireClient: async () => ({ fullName: 'Maya Lee' }),
}));
vi.mock('@/lib/portal/orders', () => ({ getPortalOrders: async () => [] }));

import PortalHomePage from '@/app/portal/(gated)/page';
import { PASSWORD_MESSAGES } from '@/lib/auth/messages';

const page = (notice?: string) =>
  PortalHomePage({ searchParams: Promise.resolve(notice ? { notice } : {}) });

describe('/portal dashboard', () => {
  it('says when a reset could not sign the other devices out', async () => {
    render(await page('others-kept'));
    expect(screen.getByText(PASSWORD_MESSAGES.CHANGED_OTHERS_KEPT)).toBeInTheDocument();
    expect(PASSWORD_MESSAGES.CHANGED_OTHERS_KEPT).toBe(
      'Password changed, but other devices could not be signed out. Sign out there yourself.',
    );
  });

  it('shows no notice for anything else in the query string', async () => {
    render(await page('signed-out'));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByText(PASSWORD_MESSAGES.CHANGED_OTHERS_KEPT)).not.toBeInTheDocument();
  });
});
