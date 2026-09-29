'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { NativeSelect } from '@/components/ui/native-select';
import { createUploadUrl } from '@/lib/admin/media-actions';
import { MEDIA_BUCKET, MEDIA_KINDS, type MediaKind } from '@/lib/admin/media-paths';
import { createClient } from '@/lib/supabase/client';

/** Files go browser to Storage, one signed URL each, never through a server action. */
export function MediaUploader({ invitationId }: { invitationId: string }) {
  const router = useRouter();
  const [kind, setKind] = useState<MediaKind>(MEDIA_KINDS.PHOTOS);
  const [files, setFiles] = useState<File[]>([]);
  const [log, setLog] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  async function upload() {
    setBusy(true);
    const bucket = createClient().storage.from(MEDIA_BUCKET);
    const lines: string[] = [];

    for (const file of files) {
      const signed = await createUploadUrl({
        invitationId,
        kind,
        fileName: file.name,
        contentType: file.type,
      });
      if (!signed.ok) {
        lines.push(signed.message);
        continue;
      }
      const { error } = await bucket.uploadToSignedUrl(signed.path, signed.token, file, {
        contentType: file.type,
      });
      lines.push(error ? `${file.name}: upload failed.` : `${file.name}: uploaded.`);
    }

    setLog(lines);
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <NativeSelect
          aria-label="What these files are"
          onChange={(event) => setKind(z.enum(MEDIA_KINDS).parse(event.target.value))}
          value={kind}
        >
          <option value={MEDIA_KINDS.PHOTOS}>Gallery photos</option>
          <option value={MEDIA_KINDS.HERO}>Opening photo or video</option>
          <option value={MEDIA_KINDS.ENVELOPE}>Envelope frames</option>
        </NativeSelect>
        <input
          accept="image/webp,video/mp4"
          aria-label="Files to upload"
          multiple
          onChange={(event) => setFiles(Array.from(event.target.files ?? []))}
          type="file"
        />
        <Button disabled={busy || files.length === 0} onClick={upload} type="button">
          {busy ? 'Uploading' : `Upload ${files.length || ''}`.trim()}
        </Button>
      </div>
      {log.length ? (
        <ul className="text-muted-foreground">
          {log.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
