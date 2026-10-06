import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createUploadUrl, uploadToSignedUrl } = vi.hoisted(() => ({
  createUploadUrl: vi.fn(),
  uploadToSignedUrl: vi.fn(),
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock('@/lib/admin/media-actions', () => ({ createUploadUrl }));
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({ storage: { from: () => ({ uploadToSignedUrl }) } }),
}));

import { MediaUploader } from '@/components/admin/MediaUploader';

const webp = (name: string) => new File(['x'], name, { type: 'image/webp' });

function drop(files: File[]) {
  fireEvent.drop(screen.getByText('Drop files here'), { dataTransfer: { files } });
}

beforeEach(() => {
  vi.clearAllMocks();
  createUploadUrl.mockResolvedValue({ ok: true, path: 'p', token: 't' });
  uploadToSignedUrl.mockResolvedValue({ error: null });
});

describe('MediaUploader', () => {
  it('skips a dropped file of the wrong type and says so', () => {
    render(<MediaUploader invitationId="inv-1" />);
    drop([webp('one.webp'), new File(['x'], 'two.png', { type: 'image/png' })]);

    expect(screen.getByText('two.png: skipped, use WebP or MP4.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Upload 1' })).toBeEnabled();
  });

  /* Review minor: a throw left the button stuck on "Uploading". */
  it('frees the button even when starting an upload throws', async () => {
    createUploadUrl.mockRejectedValue(new Error('network'));
    render(<MediaUploader invitationId="inv-1" />);
    drop([webp('one.webp')]);
    fireEvent.click(screen.getByRole('button', { name: 'Upload 1' }));

    await waitFor(() => expect(screen.getByText('one.webp: upload failed.')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Upload' })).not.toHaveTextContent('Uploading');
  });

  it('shows two identical failures as two lines', async () => {
    uploadToSignedUrl.mockResolvedValue({ error: { message: 'x' } });
    render(<MediaUploader invitationId="inv-1" />);
    drop([webp('same.webp'), webp('same.webp')]);
    fireEvent.click(screen.getByRole('button', { name: 'Upload 2' }));

    await waitFor(() => expect(screen.getAllByText('same.webp: upload failed.')).toHaveLength(2));
  });

  it('lets the same file be picked again after an upload', async () => {
    render(<MediaUploader invitationId="inv-1" />);
    const input = screen.getByLabelText<HTMLInputElement>('Files to upload');
    fireEvent.change(input, { target: { files: [webp('one.webp')] } });
    fireEvent.click(screen.getByRole('button', { name: 'Upload 1' }));

    await waitFor(() => expect(screen.getByText('one.webp: uploaded.')).toBeInTheDocument());
    expect(input.value).toBe('');
  });

  /* Review minor: a file dropped beside the zone opened in the browser. */
  it('stops a file dropped outside the zone from opening in the browser', () => {
    render(<MediaUploader invitationId="inv-1" />);
    const stray = new Event('drop', { bubbles: true, cancelable: true });
    window.dispatchEvent(stray);
    expect(stray.defaultPrevented).toBe(true);
  });
});
