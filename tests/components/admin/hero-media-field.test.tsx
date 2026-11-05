import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { uploadMedia } = vi.hoisted(() => ({ uploadMedia: vi.fn() }));
vi.mock('@/lib/admin/upload-media', () => ({ uploadMedia }));

import { HeroMediaField } from '@/components/admin/content-form/HeroMediaField';
import { HERO_HEAVY_BYTES, MEDIA_MAX_BYTES } from '@/lib/admin/media-paths';

const URL_IN_USE = 'https://cdn.example/inv-1/hero/clip.mp4';

function fileOf(name: string, type: string, size = 1024): File {
  const file = new File(['x'], name, { type });
  Object.defineProperty(file, 'size', { value: size });
  return file;
}

function renderField(value: unknown = undefined) {
  const onChange = vi.fn();
  render(
    <HeroMediaField
      invitationId="inv-1"
      issue={undefined}
      label="Opening photo or video"
      onChange={onChange}
      value={value}
    />,
  );
  return onChange;
}

const pick = (file: File) =>
  fireEvent.change(screen.getByLabelText(/Opening photo or video/), { target: { files: [file] } });

beforeEach(() => {
  vi.clearAllMocks();
  uploadMedia.mockResolvedValue({ ok: true, url: URL_IN_USE });
});

describe('HeroMediaField', () => {
  it('uploads a video and fills in the type and URL itself', async () => {
    const onChange = renderField();
    pick(fileOf('Sarah_p1.mp4', 'video/mp4'));

    await waitFor(() => expect(onChange).toHaveBeenCalledWith({ type: 'video', src: URL_IN_USE }));
    /* A fresh name every time, so a replacement is never served from cache. */
    expect(uploadMedia.mock.calls[0][3]).toMatch(/^Sarah_p1-[a-z0-9]+\.mp4$/);
    expect(screen.getByRole('status')).toHaveTextContent('Save content');
  });

  it('reads a WebP as a photo', async () => {
    const onChange = renderField();
    pick(fileOf('cover.webp', 'image/webp'));
    await waitFor(() => expect(onChange).toHaveBeenCalledWith({ type: 'image', src: URL_IN_USE }));
  });

  it('warns about a heavy clip but still uses it', async () => {
    const onChange = renderField();
    pick(fileOf('long.mp4', 'video/mp4', HERO_HEAVY_BYTES + 1));

    await waitFor(() => expect(onChange).toHaveBeenCalled());
    expect(screen.getByRole('status')).toHaveTextContent('may load slowly');
  });

  it('refuses a file over the storage limit without uploading', () => {
    renderField();
    pick(fileOf('huge.mp4', 'video/mp4', MEDIA_MAX_BYTES + 1));

    expect(uploadMedia).not.toHaveBeenCalled();
    expect(screen.getByRole('status')).toHaveTextContent('over the');
  });

  it('refuses another file type without uploading', () => {
    renderField();
    pick(fileOf('clip.mov', 'video/quicktime'));

    expect(uploadMedia).not.toHaveBeenCalled();
    expect(screen.getByRole('status')).toHaveTextContent('use an MP4 video or a WebP photo');
  });

  it('keeps the current file when an upload fails, and says why', async () => {
    uploadMedia.mockResolvedValue({ ok: false, message: 'clip.mp4: upload failed.' });
    const onChange = renderField({ type: 'video', src: URL_IN_USE });
    pick(fileOf('clip.mp4', 'video/mp4'));

    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('upload failed'));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('plays the file in use and removes it', () => {
    const onChange = renderField({ type: 'video', src: URL_IN_USE });
    expect(screen.getByLabelText('Opening video in use')).toHaveAttribute('src', URL_IN_USE);

    fireEvent.click(screen.getByRole('button', { name: 'Remove' }));
    expect(onChange).toHaveBeenCalledWith(undefined);
  });

  /* What a hand-typed "hero/clip.mp4" looked like: a dark screen, no reason. */
  it('says so when the file in use cannot be loaded', () => {
    renderField({ type: 'video', src: 'hero/sarah-p1.mp4' });
    fireEvent.error(screen.getByLabelText('Opening video in use'));
    expect(screen.getByText(/could not be loaded/)).toBeInTheDocument();
  });
});
