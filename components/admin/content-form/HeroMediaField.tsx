'use client';

import { useId, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { isRecord } from '@/lib/admin/content-form';
import { HERO_HEAVY_BYTES, MEDIA_KINDS, MEDIA_MAX_BYTES } from '@/lib/admin/media-paths';
import { uploadMedia } from '@/lib/admin/upload-media';
import { cn } from '@/lib/utils';

const TYPE_FOR = { 'video/mp4': 'video', 'image/webp': 'image' } as const;
type HeroType = (typeof TYPE_FOR)[keyof typeof TYPE_FOR];
type HeroMedia = { type: HeroType; src: string };

function isAcceptedType(type: string): type is keyof typeof TYPE_FOR {
  return type in TYPE_FOR;
}

function asHeroMedia(value: unknown): HeroMedia | null {
  if (!isRecord(value) || typeof value.src !== 'string' || !value.src) return null;
  return { type: value.type === 'image' ? 'image' : 'video', src: value.src };
}

const megabytes = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;

/* A fresh name per upload. Re-using a name overwrites the file in place, and
   the CDN and browsers would keep showing the old clip under the same URL. */
function uniqueName(fileName: string): string {
  const dot = fileName.lastIndexOf('.');
  const stem = dot > 0 ? fileName.slice(0, dot) : fileName;
  const ext = dot > 0 ? fileName.slice(dot) : '';
  return `${stem}-${Date.now().toString(36)}${ext}`;
}

type HeroMediaFieldProps = {
  label: string;
  value: unknown;
  onChange: (next: unknown) => void;
  invitationId: string;
  issue: string | undefined;
};

/**
 * The opening photo or video as one box: drop or choose a file, it uploads
 * and fills itself in, and what is in use plays right here. The stored value
 * keeps its `{ type, src }` shape; the type is read off the file and the src
 * is the uploaded file's public URL, so neither is ever typed by hand.
 */
export function HeroMediaField({ label, value, onChange, invitationId, issue }: HeroMediaFieldProps) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [over, setOver] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [broken, setBroken] = useState(false);
  const media = asHeroMedia(value);

  async function take(file: File | undefined) {
    if (inputRef.current) inputRef.current.value = '';
    if (!file) return;
    if (!isAcceptedType(file.type)) {
      setNote(`${file.name}: use an MP4 video or a WebP photo.`);
      return;
    }
    if (file.size > MEDIA_MAX_BYTES) {
      setNote(
        `${file.name} is ${megabytes(file.size)}, over the ${megabytes(MEDIA_MAX_BYTES)} limit. Export a shorter or smaller clip.`,
      );
      return;
    }

    setBusy(true);
    setNote(null);
    const result = await uploadMedia(invitationId, MEDIA_KINDS.HERO, file, uniqueName(file.name));
    setBusy(false);
    if (!result.ok) {
      setNote(result.message);
      return;
    }

    setBroken(false);
    onChange({ type: TYPE_FOR[file.type], src: result.url });
    setNote(
      file.size > HERO_HEAVY_BYTES
        ? `Uploaded, but at ${megabytes(file.size)} it may load slowly on mobile data. Under ${megabytes(HERO_HEAVY_BYTES)} is kinder to guests. Save content to use it.`
        : 'Uploaded. Save content to put it on the invitation.',
    );
  }

  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>
        {label}
        <span className="font-normal text-muted-foreground"> (optional)</span>
      </Label>
      <input
        accept={Object.keys(TYPE_FOR).join(',')}
        className="sr-only"
        disabled={busy}
        id={id}
        onChange={(event) => take(event.target.files?.[0])}
        ref={inputRef}
        type="file"
      />

      {media ? (
        <div className="grid gap-3 rounded-xl border p-4">
          {broken ? (
            <p className="text-wine">This file could not be loaded. Replace it with a new upload.</p>
          ) : media.type === 'video' ? (
            <video
              aria-label="Opening video in use"
              autoPlay
              className="max-h-72 justify-self-start rounded-lg bg-muted"
              key={media.src}
              loop
              muted
              onError={() => setBroken(true)}
              playsInline
              src={media.src}
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element -- an admin preview of an arbitrary upload, not a page image
            <img
              alt="Opening photo in use"
              className="max-h-72 justify-self-start rounded-lg bg-muted"
              key={media.src}
              onError={() => setBroken(true)}
              src={media.src}
            />
          )}
          <div className="flex flex-wrap gap-2">
            <Button
              disabled={busy}
              onClick={() => inputRef.current?.click()}
              type="button"
              variant="outline"
            >
              {busy ? 'Uploading' : 'Replace'}
            </Button>
            <Button
              disabled={busy}
              onClick={() => {
                setNote(null);
                setBroken(false);
                onChange(undefined);
              }}
              type="button"
              variant="ghost"
            >
              Remove
            </Button>
          </div>
        </div>
      ) : (
        <label
          className={cn(
            'grid cursor-pointer justify-items-center gap-1 rounded-xl border border-dashed px-6 py-8 text-center transition-colors',
            over ? 'border-wine bg-wine/5' : 'hover:bg-muted',
          )}
          htmlFor={id}
          onDragLeave={() => setOver(false)}
          onDragOver={(event) => {
            event.preventDefault();
            setOver(true);
          }}
          onDrop={(event) => {
            event.preventDefault();
            setOver(false);
            void take(event.dataTransfer.files[0]);
          }}
        >
          <span className="font-heading text-[18px]">
            {busy ? 'Uploading' : 'Drop the opening video or photo'}
          </span>
          <span className="text-muted-foreground">or click to choose. MP4 video or WebP photo.</span>
        </label>
      )}

      {note ? (
        <p className="text-muted-foreground" role="status">
          {note}
        </p>
      ) : null}
      {issue ? <p className="text-[12px] text-wine">{issue}</p> : null}
    </div>
  );
}
