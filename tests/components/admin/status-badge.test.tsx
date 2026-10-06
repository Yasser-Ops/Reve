import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StatusBadge } from '@/components/admin/StatusBadge';

describe('StatusBadge', () => {
  it('shows the admin wording and carries the stage for styling', () => {
    render(<StatusBadge status="review" />);
    expect(screen.getByText('Awaiting approval')).toHaveAttribute('data-status', 'review');
  });

  it('strikes through a cancelled order', () => {
    render(<StatusBadge status="cancelled" />);
    expect(screen.getByText('Cancelled').className).toContain('line-through');
  });
});
