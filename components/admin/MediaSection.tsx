import { MediaUploader } from '@/components/admin/MediaUploader';
import { listMedia } from '@/lib/admin/media';

/** Uploaded files with the URL to paste into the content JSON. */
export async function MediaSection({ invitationId }: { invitationId: string }) {
  const files = await listMedia(invitationId);

  return (
    <section className="grid gap-4">
      <h2 className="font-medium">Media</h2>
      <MediaUploader invitationId={invitationId} />
      {files.length ? (
        <ul className="grid gap-1 font-mono text-[12px]">
          {files.map((file) => (
            <li key={`${file.kind}/${file.name}`}>
              <span className="text-muted-foreground">{file.kind}/</span>
              {file.name} <span className="select-all text-muted-foreground">{file.url}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground">Nothing uploaded yet.</p>
      )}
    </section>
  );
}
