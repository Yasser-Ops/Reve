import { MediaUploader } from '@/components/admin/MediaUploader';
import type { listMedia } from '@/lib/admin/media';

type MediaFile = Awaited<ReturnType<typeof listMedia>>[number];

/** Uploaded files. Media fields in the content form offer these by kind. */
export function MediaSection({
  invitationId,
  files,
}: {
  invitationId: string;
  files: readonly MediaFile[];
}) {
  return (
    <section className="grid gap-4 rounded-2xl border bg-card p-5 sm:p-6">
      <h2 className="font-heading text-[22px]">Media</h2>
      <MediaUploader invitationId={invitationId} />
      {files.length ? (
        <ul className="grid gap-1 font-mono text-[12px]">
          {files.map((file) => (
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
