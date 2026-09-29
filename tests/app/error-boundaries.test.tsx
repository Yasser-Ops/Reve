import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import AdminError from '@/app/admin/error';
import InvitationError from '@/app/i/[slug]/error';

/* Every error these segments throw is server-side (Supabase down, a failed
   membership read, bad stored content). In Next 16 only `retry` re-fetches
   the segment; `reset` re-renders the same failed payload, so a "Try again"
   wired to it can never recover. */
describe('error boundaries', () => {
  it.each([
    ['admin', AdminError, /try again/i],
    ['invitation', InvitationError, /retry/i],
  ])('the %s boundary retries by re-fetching', (_name, Boundary, label) => {
    const retry = vi.fn();
    const reset = vi.fn();

    render(<Boundary error={new Error('boom')} reset={reset} retry={retry} />);
    fireEvent.click(screen.getByRole('button', { name: label }));

    expect(retry).toHaveBeenCalledOnce();
    expect(reset).not.toHaveBeenCalled();
  });
});
