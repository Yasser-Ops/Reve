import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Breadcrumbs } from '@/components/admin/Breadcrumbs';

describe('Breadcrumbs', () => {
  it('links every crumb but the last, which marks the current page', () => {
    render(<Breadcrumbs items={[{ label: 'Clients', href: '/admin' }, { label: 'Maya Haddad' }]} />);

    expect(screen.getByRole('link', { name: 'Clients' })).toHaveAttribute('href', '/admin');
    expect(screen.getByText('Maya Haddad')).toHaveAttribute('aria-current', 'page');
    expect(screen.queryByRole('link', { name: 'Maya Haddad' })).toBeNull();
  });
});
