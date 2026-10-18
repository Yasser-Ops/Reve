import type { ReactNode } from 'react';
import { screenFor } from '@/components/invitation/screen';

/** Phone width the templates are laid out at before being scaled down. */
export const RENDER_WIDTH = 430;

/** The thumbnails' screen: every frame that shows one is 9:16. */
export const THUMBNAIL_ASPECT = 9 / 16;

/**
 * Renders a full invitation template at phone width, then scales it to fit.
 *
 * Templates are designed for a real viewport, so reflowing one into a small
 * box would produce a layout no guest ever sees. Rendering at a real phone
 * width and scaling keeps every proportion — type against measure, spacing
 * against width — exactly as it will be in a guest's hand.
 *
 * The scale is applied from a CSS custom property against the frame's own
 * width rather than a hardcoded factor, so the thumbnail fits whatever box it
 * is dropped into and no name is ever clipped at the edge.
 */
export function TemplateThumbnail({ children }: { children: ReactNode }) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute left-0 top-0 origin-top-left select-none"
      style={{
        /* The hero fills the frame, not the browser window. */
        ...screenFor(RENDER_WIDTH, THUMBNAIL_ASPECT),
        width: RENDER_WIDTH,
        transform: `scale(var(--thumb-scale))`,
      }}
    >
      {children}
    </div>
  );
}
