import type { ReactNode } from 'react';
import { RENDER_WIDTH } from '@/components/store/TemplateThumbnail';

/**
 * A template thumbnail that needs no client island.
 *
 * TemplateCard measures its own width in JS because it must react to a
 * responsive grid. A frame with a known aspect does not: the scale is the
 * frame's width over the render width, and `cqw` expresses exactly that
 * without shipping a ResizeObserver to do arithmetic the browser already knows.
 *
 * The invitation inside is rendered at real phone width and scaled, never
 * reflowed, so every proportion stays as a guest will see it.
 */
export function TemplateFrame({
  children,
  fade = true,
}: {
  children: ReactNode;
  /** Fade the cut edge, to say the invitation continues past the crop. */
  fade?: boolean;
}) {
  return (
    <div
      className="relative aspect-9/16 w-full overflow-hidden"
      style={{ containerType: 'inline-size' }}
    >
      {/* scale() needs a unitless number, and calc() cannot divide a length by
          a length. Dividing by 1px first reduces the ratio to a plain number;
          an invalid transform would silently not scale at all, rendering the
          invitation at full width and cutting it off. */}
      <div
        className="pointer-events-none absolute left-0 top-0 origin-top-left select-none"
        style={{
          width: `${RENDER_WIDTH}px`,
          transform: `scale(calc((100cqw / 1px) / ${RENDER_WIDTH}))`,
        }}
      >
        {children}
      </div>

      {fade ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-20"
          style={{
            background:
              'linear-gradient(to bottom, transparent, var(--color-screen))',
          }}
        />
      ) : null}
    </div>
  );
}
