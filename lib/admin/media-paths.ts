export const MEDIA_BUCKET = 'invitation-media';

export const MEDIA_KINDS = {
  PHOTOS: 'photos',
  HERO: 'hero',
  ENVELOPE: 'envelope',
} as const;

export type MediaKind = (typeof MEDIA_KINDS)[keyof typeof MEDIA_KINDS];

const ACCEPTS: Record<MediaKind, readonly string[]> = {
  photos: ['image/webp'],
  hero: ['image/webp', 'video/mp4'],
  envelope: ['image/webp'],
};

/** Mirrors the bucket's file_size_limit (migration 0005). */
export const MEDIA_MAX_BYTES = 50 * 1024 * 1024;

/** Past this an opening video loads slowly for a guest on mobile data. */
export const HERO_HEAVY_BYTES = 15 * 1024 * 1024;

export function acceptsType(kind: MediaKind, contentType: string): boolean {
  return ACCEPTS[kind].includes(contentType);
}

/**
 * `<invitationId>/<kind>/<clean-name>.<ext>`. The name is reduced to
 * lowercase words so no upload can climb out of its folder or collide on case.
 */
export function mediaPath(invitationId: string, kind: MediaKind, fileName: string): string {
  const dot = fileName.lastIndexOf('.');
  const ext = dot > 0 ? fileName.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, '') : '';
  const stem =
    (dot > 0 ? fileName.slice(0, dot) : fileName)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'file';

  return `${invitationId}/${kind}/${stem}${ext ? `.${ext}` : ''}`;
}
