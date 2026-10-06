import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ActionForm } from '@/components/admin/ActionForm';
import type { ActionResult } from '@/lib/admin/action-result';

describe('ActionForm', () => {
  it('shows the message an action refuses with', async () => {
    const refuse = async (): Promise<ActionResult> => ({ ok: false, message: 'Not yet.' });

    render(
      <ActionForm action={refuse} submitLabel="Save">
        <input name="x" defaultValue="1" />
      </ActionForm>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(screen.getByText('Not yet.')).toBeInTheDocument());
  });

  it('confirms a success when asked to', async () => {
    const accept = async (): Promise<ActionResult> => ({ ok: true });

    render(<ActionForm action={accept} submitLabel="Save" successMessage="Saved." />);
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(screen.getByText('Saved.')).toBeInTheDocument());
  });

  it('tells its owner when the action succeeded', async () => {
    const accept = async (): Promise<ActionResult> => ({ ok: true });
    let succeeded = false;

    render(<ActionForm action={accept} onSuccess={() => (succeeded = true)} submitLabel="Go" />);
    fireEvent.click(screen.getByRole('button', { name: 'Go' }));

    await waitFor(() => expect(succeeded).toBe(true));
  });

  it('can be held shut', () => {
    render(<ActionForm action={async () => ({ ok: true })} disabled submitLabel="Publish" />);
    expect(screen.getByRole('button', { name: 'Publish' })).toBeDisabled();
  });
});
