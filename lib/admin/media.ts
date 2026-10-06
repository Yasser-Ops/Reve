import 'server-only';
import { MEDIA_BUCKET, MEDIA_KINDS, type MediaKind } from '@/lib/admin/media-paths';
import { createClient } from '@/lib/supabase/server';

type ServerClient = Awaited<ReturnType<typeof createClient>>;

export async function listMedia(invitationId: string) {
  const supabase = await createClient();
  const bucket = supabase.storage.from(MEDIA_BUCKET);
  const files: { kind: MediaKind; name: string; url: string }[] = [];

  for (const kind of Object.values(MEDIA_KINDS)) {
    const folder = `${invitationId}/${kind}`;
    const { data, error } = await bucket.list(folder, {
      limit: 1000,
      sortBy: { column: 'name', order: 'asc' },
    });
    if (error) throw error;
    for (const file of data) {
      files.push({
        kind,
        name: file.name,
        url: bucket.getPublicUrl(`${folder}/${file.name}`).data.publicUrl,
      });
    }
  }

  return files;
}

/**
 * Removes every uploaded file under the given invitations. Returns false if
 * any listing or the removal failed; the caller decides what that means.
 */
export async function removeInvitationMedia(
  supabase: ServerClient,
  invitationIds: readonly string[],
): Promise<boolean> {
  const bucket = supabase.storage.from(MEDIA_BUCKET);
  const paths: string[] = [];

  for (const id of invitationIds) {
    for (const kind of Object.values(MEDIA_KINDS)) {
      const folder = `${id}/${kind}`;
      const { data, error } = await bucket.list(folder, { limit: 1000 });
      if (error) return false;
      paths.push(...data.map((file) => `${folder}/${file.name}`));
    }
  }

  if (paths.length === 0) return true;
  const { error } = await bucket.remove(paths);
  return !error;
}
