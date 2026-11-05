'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { NativeSelect } from '@/components/ui/native-select';
import { MEDIA_KINDS, type MediaKind } from '@/lib/admin/media-paths';
import { uploadMedia } from '@/lib/admin/upload-media';
import { cn } from '@/lib/utils';

/* What the picker accepts. A drop bypasses `accept`, so drops are filtered
   against the same list; the server checks each kind again. */
const ACCEPTED_TYPES = ['image/webp'] as const;

/* The opening photo or video has its own upload box in the content form. */
const KINDS = [MEDIA_KINDS.PHOTOS, MEDIA_KINDS.ENVELOPE] as const;

function isAccepted(file: File): boolean {
  return ACCEPTED_TYPES.some((type) => type === file.type);
}

/** Gallery photos and envelope frames, many at once. */
export function MediaUploader({ invitationId }: { invitationId: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [kind, setKind] = useState<MediaKind>(MEDIA_KINDS.PHOTOS);
  const [files, setFiles] = useState<File[]>([]);
  const [log, setLog] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [over, setOver] = useState(false);

  /* A file dropped just beside the zone would otherwise open in the tab and
     throw the page away. */
  useEffect(() => {
    const keep = (event: DragEvent) => event.preventDefault();
    window.addEventListener('dragover', keep);
    window.addEventListener('drop', keep);
    return () => {
      window.removeEventListener('dragover', keep);
      window.removeEventListener('drop', keep);
    };
  }, []);

  function choose(chosen: File[]) {
    const skipped = chosen.filter((file) => !isAccepted(file));
    setFiles(chosen.filter(isAccepted));
    setLog(skipped.map((file) => `${file.name}: skipped, use WebP.`));
  }

  async function upload() {
    setBusy(true);
    setLog([]);
    const note = (line: string) => setLog((current) => [...current, line]);

    try {
      /* One file failing never stops the rest: uploadMedia never throws. */
      for (const file of files) {
        const result = await uploadMedia(invitationId, kind, file);
        note(result.ok ? `${file.name}: uploaded.` : result.message);
      }
    } finally {
      setFiles([]);
      /* Cleared so picking the same file again fires a change. */
      if (inputRef.current) inputRef.current.value = '';
      setBusy(false);
      router.refresh();
    }
  }

  return (
    <div className="grid gap-3">
      <NativeSelect
        aria-label="What these files are"
        className="justify-self-start"
        onChange={(event) => setKind(z.enum(KINDS).parse(event.target.value))}
        value={kind}
      >
        <option value={MEDIA_KINDS.PHOTOS}>Gallery photos</option>
        <option value={MEDIA_KINDS.ENVELOPE}>Envelope frames</option>
      </NativeSelect>
      <label
        className={cn(
          'grid cursor-pointer justify-items-center gap-1 rounded-xl border border-dashed px-6 py-10 text-center transition-colors',
          over ? 'border-wine bg-wine/5' : 'hover:bg-muted',
        )}
        onDragLeave={() => setOver(false)}
        onDragOver={(event) => {
          event.preventDefault();
          setOver(true);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setOver(false);
          choose(Array.from(event.dataTransfer.files));
        }}
      >
        <input
          accept={ACCEPTED_TYPES.join(',')}
          aria-label="Files to upload"
          className="sr-only"
          multiple
          onChange={(event) => choose(Array.from(event.target.files ?? []))}
          ref={inputRef}
          type="file"
        />
        <span className="font-heading text-[18px]">Drop files here</span>
        <span className="text-muted-foreground">
          or click to choose. WebP only. The opening photo or video has its own box above.
        </span>
        {files.length ? (
          <span className="mt-2 text-[12px]">{files.map((file) => file.name).join(', ')}</span>
        ) : null}
      </label>
      <Button
        className="justify-self-start"
        disabled={busy || files.length === 0}
        onClick={upload}
        type="button"
      >
        {busy ? 'Uploading' : files.length ? `Upload ${files.length}` : 'Upload'}
      </Button>
      {log.length ? (
        <ul className="text-muted-foreground">
          {log.map((line, index) => (
            /* Lines can repeat (two failures, same message); order is stable. */
            <li key={`${index}:${line}`}>{line}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
