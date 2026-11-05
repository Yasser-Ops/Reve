import { MediaUploader } from '@/components/admin/MediaUploader';
import type { listMedia } from '@/lib/admin/media';
import { MEDIA_KINDS } from '@/lib/admin/media-paths';

type MediaFile = Awaited<ReturnType<typeof listMedia>>[number];

/**
 * Uploaded gallery photos and envelope frames. Media fields in the content
 * form offer these by kind. Opening files are left out: their own box in the
 * form shows the one in use.
 */
export function MediaSection({
  invitationId,
  files,
}: {
  invitationId: string;
  files: readonly MediaFile[];
}) {
  const listed = files.filter((file) => file.kind !== MEDIA_KINDS.HERO);

  return (
    <section className="grid gap-4 rounded-2xl border bg-card p-5 sm:p-6">
      <h2 className="font-heading text-[22px]">Media</h2>
      <MediaUploader invitationId={invitationId} />
      {listed.length ? (
        <ul className="grid gap-1 font-mono text-[12px]">
          {listed.map((file) => (
            <li className="truncate" key={`${file.kind}/${file.name}`}>
              <span className="text-muted-foreground">{file.kind}/</span>
              {file.name}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground">Nothing uploaded yet.</p>
      )}
    </section>
  );
}
