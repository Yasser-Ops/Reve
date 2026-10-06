import 'server-only';
import { MEDIA_BUCKET, MEDIA_KINDS, type MediaKind } from '@/lib/admin/media-paths';
import { createClient } from '@/lib/supabase/server';

type ServerClient = Awaited<ReturnType<typeof createClient>>;

/** Every kind's folder is listed at once: each listing is a round trip. */
export async function listMedia(invitationId: string) {
  const supabase = await createClient();
  const bucket = supabase.storage.from(MEDIA_BUCKET);

  const perKind = await Promise.all(
    Object.values(MEDIA_KINDS).map(async (kind: MediaKind) => {
      const folder = `${invitationId}/${kind}`;
      const { data, error } = await bucket.list(folder, {
        limit: 1000,
        sortBy: { column: 'name', order: 'asc' },
      });
      if (error) throw error;
      return data.map((file) => ({
        kind,
        name: file.name,
        url: bucket.getPublicUrl(`${folder}/${file.name}`).data.publicUrl,
      }));
    }),
  );

  return perKind.flat();
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
