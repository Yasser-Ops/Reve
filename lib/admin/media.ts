import 'server-only';
import { MEDIA_BUCKET, MEDIA_KINDS, type MediaKind } from '@/lib/admin/media-paths';
import { createClient } from '@/lib/supabase/server';

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
