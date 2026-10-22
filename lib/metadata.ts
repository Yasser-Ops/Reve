import type { Metadata } from 'next';

/**
 * Link previews, built once.
 *
 * A page's `openGraph` replaces its layout's rather than merging with it, so a
 * page that set a title and description silently dropped the image. Every page
 * takes its preview from here instead, and none can ship one without a picture.
 *
 * The images are rendered by `pnpm og:images` (scripts/og-images.mjs). They are
 * set here, not through the opengraph-image file convention, because a file at
 * the root would outrank a design page's own image.
 */

/** The site's preview: the monogram beside a collection card. */
export const SITE_OG_IMAGE = '/og.jpg';

/** A design page's preview: its collection card, sample couple and all. */
export function designOgImage(slug: string) {
  return `/collection/${slug}/og.jpg`;
}

/**
 * A couple's invitation preview: the sealed envelope alone. Never the
 * collection card, whose paper carries the sample couple's names.
 */
export function envelopeOgImage(slug: string) {
  return `/envelope/${slug}/og.jpg`;
}

/** Every preview image is rendered at this size. */
const OG_SIZE = { width: 1200, height: 630 } as const;

export function socialMetadata({
  title,
  description,
  image = SITE_OG_IMAGE,
  alt = 'Rêve, digital invitations designed by hand in Lebanon',
}: {
  title: string;
  description: string;
  image?: string;
  alt?: string;
}): Pick<Metadata, 'openGraph' | 'twitter'> {
  const images = [{ url: image, alt, ...OG_SIZE }];

  return {
    openGraph: { title, description, type: 'website', siteName: 'Rêve', images },
    twitter: { card: 'summary_large_image', title, description, images },
  };
}
