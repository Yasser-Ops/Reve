import { createUploadUrl } from '@/lib/admin/media-actions';
import { MEDIA_BUCKET, type MediaKind } from '@/lib/admin/media-paths';
import { createClient } from '@/lib/supabase/client';

export type UploadResult = { ok: true; url: string } | { ok: false; message: string };

/**
 * One file, browser straight to Storage through a signed URL, never through a
 * server action. Resolves to the file's public URL, which is what content
 * stores. Never throws: a dropped connection is a failed upload like any other.
 */
export async function uploadMedia(
  invitationId: string,
  kind: MediaKind,
  file: File,
  fileName: string = file.name,
): Promise<UploadResult> {
  try {
    const signed = await createUploadUrl({
      invitationId,
      kind,
      fileName,
      contentType: file.type,
    });
    if (!signed.ok) return signed;

    const bucket = createClient().storage.from(MEDIA_BUCKET);
    const { error } = await bucket.uploadToSignedUrl(signed.path, signed.token, file, {
      contentType: file.type,
    });
    if (error) return { ok: false, message: `${file.name}: upload failed.` };

    return { ok: true, url: bucket.getPublicUrl(signed.path).data.publicUrl };
  } catch {
    return { ok: false, message: `${file.name}: upload failed.` };
  }
}
