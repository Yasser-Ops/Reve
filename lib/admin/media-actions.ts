'use server';

import { z } from 'zod';
import { MEDIA_BUCKET, MEDIA_KINDS, acceptsType, mediaPath } from '@/lib/admin/media-paths';
import { requireAdmin } from '@/lib/auth/guards';
import { createClient } from '@/lib/supabase/server';

const uploadSchema = z.object({
  invitationId: z.uuid(),
  kind: z.enum(MEDIA_KINDS),
  fileName: z.string().min(1).max(200),
  contentType: z.string().min(1).max(100),
});

/**
 * A one-time URL for the browser to upload a single file to. Signed as the
 * admin, so the storage policies decide; re-uploading the same name
 * replaces it, which is how a frame is corrected.
 */
export async function createUploadUrl(
  input: z.input<typeof uploadSchema>,
): Promise<{ ok: true; path: string; token: string } | { ok: false; message: string }> {
  await requireAdmin();
  const parsed = uploadSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: 'That upload is not allowed.' };

  const { invitationId, kind, fileName, contentType } = parsed.data;
  if (!acceptsType(kind, contentType)) {
    const accepted = kind === MEDIA_KINDS.HERO ? 'WebP or MP4' : 'WebP';
    return {
      ok: false,
      message: `${fileName}: ${kind} takes ${accepted}. Convert it with pnpm optimize:images <folder>.`,
    };
  }

  const supabase = await createClient();
  const path = mediaPath(invitationId, kind, fileName);
  const { data, error } = await supabase.storage
    .from(MEDIA_BUCKET)
    .createSignedUploadUrl(path, { upsert: true });
  if (error) return { ok: false, message: `${fileName}: could not start the upload.` };

  return { ok: true, path: data.path, token: data.token };
}
