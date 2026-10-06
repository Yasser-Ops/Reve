import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { linContentSchema } from '@/components/invitation/templates/lin/schema';
import { formModel } from '@/lib/admin/content-form';

vi.mock('@/lib/admin/invitation-actions', () => ({
  saveContent: async () => ({ ok: true }),
}));

import { ContentEditor } from '@/components/admin/ContentEditor';

function renderEditor() {
  return render(
    <ContentEditor
      fields={formModel(linContentSchema)}
      initial={{ coupleFirstName: 'Malik' }}
      invitationId="11111111-1111-4111-8111-111111111111"
      media={{ photos: [], hero: [], envelope: [] }}
      previewUrl="/admin/preview/x"
    />,
  );
}

describe('ContentEditor', () => {
  /* Review minor: "Saved." stayed up after further edits. */
  it('says the content is unsaved after an edit, saved after a save, and unsaved again', async () => {
    renderEditor();
    const first = screen.getByLabelText('First name');

    fireEvent.change(first, { target: { value: 'Malek' } });
    expect(screen.getByText('Unsaved changes')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Save content' }));
    await waitFor(() => expect(screen.getByText('Saved.')).toBeInTheDocument());
    expect(screen.queryByText('Unsaved changes')).toBeNull();

    fireEvent.change(first, { target: { value: 'Malik' } });
    expect(screen.queryByText('Saved.')).toBeNull();
    expect(screen.getByText('Unsaved changes')).toBeInTheDocument();
  });

  /* Review minor: leaving the page threw away a long fill-in silently. */
  it('asks before the page is left with unsaved changes', () => {
    renderEditor();
    const clean = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(clean);
    expect(clean.defaultPrevented).toBe(false);

    fireEvent.change(screen.getByLabelText('First name'), { target: { value: 'Malek' } });
    const dirty = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(dirty);
    expect(dirty.defaultPrevented).toBe(true);
  });

  it('asks before an in-app link leaves unsaved changes', () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    renderEditor();
    const link = document.createElement('a');
    link.href = '/admin';
    link.textContent = 'Clients';
    document.body.append(link);

    fireEvent.change(screen.getByLabelText('First name'), { target: { value: 'Malek' } });
    const click = new MouseEvent('click', { bubbles: true, cancelable: true });
    link.dispatchEvent(click);

    expect(confirm).toHaveBeenCalled();
    expect(click.defaultPrevented).toBe(true);
    link.remove();
    confirm.mockRestore();
  });
});
