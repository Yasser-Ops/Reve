'use client';

import Link from 'next/link';
import { useCallback, useState, type ReactNode } from 'react';
import { RENDER_WIDTH } from '@/components/store/TemplateThumbnail';

type TemplateCardProps = {
  slug: string;
  name: string;
  summary: string;
  character: readonly string[];
  /** Lowest tier this design can be bought on, e.g. "$50". */
  fromPrice: string;
  /**
   * The rendered template. Passed as children rather than as a component
   * reference: a server component cannot cross the client boundary as a prop,
   * so the page renders it and this island only measures and frames it.
   */
  children: ReactNode;
};

/**
 * One design in the collection, presented as something a couple can act on.
 *
 * The card is a product surface, not a picture: the crop is a preview that
 * hands off to the full sheet rather than trying to be it. A drawn sheet runs
 * far longer than any card, so the frame deliberately shows the opening and
 * fades out, and the design's own page is where it is actually sold.
 *
 * Client-side only because the preview's scale comes from the card's measured
 * width. The template inside is ordinary server-rendered markup.
 */
export function TemplateCard({
  slug,
  name,
  summary,
  character,
  fromPrice,
  children,
}: TemplateCardProps) {
  const [scale, setScale] = useState(1);

  const measure = useCallback((node: HTMLAnchorElement | null) => {
    if (!node) return;

    const observer = new ResizeObserver(([entry]) => {
      setScale(entry.contentRect.width / RENDER_WIDTH);
    });

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <article className="group flex flex-col">
      <Link
        aria-label={`See the ${name} design`}
        className="relative block aspect-9/16 overflow-hidden rounded-[1.5rem] border border-taupe/50 shadow-[0_20px_44px_-24px_rgb(var(--reve-shadow-rgb)/0.45)] transition-transform duration-300 group-hover:-translate-y-1.5"
        href={`/collection/${slug}`}
        ref={measure}
        style={{ '--thumb-scale': scale } as React.CSSProperties}
      >
        {children}

        {/* The sheet continues past the crop. Fading the cut edge says so,
            instead of letting it read as the design ending mid-page. */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-24"
          style={{
            background:
              'linear-gradient(to bottom, transparent, rgb(var(--reve-shadow-rgb)/0.04) 40%, var(--color-screen))',
          }}
        />
      </Link>

      <div className="mt-6 flex items-baseline justify-between gap-4">
        <h3 className="reve-display text-2xl">{name}</h3>
        <p className="reve-crisp shrink-0 text-[12px] uppercase tracking-[0.12em] text-taupe">
          From {fromPrice}
        </p>
      </div>

      <p className="mt-2 text-[13.5px] leading-relaxed text-cocoa">{summary}</p>

      <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5">
        {character.map((trait) => (
          <li
            className="reve-crisp text-[11px] uppercase tracking-[0.12em] text-taupe"
            key={trait}
          >
            {trait}
          </li>
        ))}
      </ul>

      {/* mt-auto keeps the actions on a common baseline when cards in a row
          have summaries of different lengths. */}
      <div className="mt-auto flex flex-wrap items-center gap-x-5 gap-y-3 pt-6">
        <Link
          className="reve-crisp rounded-full bg-wine px-5 py-2.5 text-[11px] uppercase tracking-[0.16em] text-bone transition-opacity hover:opacity-90"
          href={`/collection/${slug}`}
        >
          See this design
        </Link>

        <Link
          className="reve-crisp text-[11px] uppercase tracking-[0.14em] text-cocoa underline-offset-4 hover:underline"
          href={`/preview/${slug}`}
        >
          View demo
        </Link>
      </div>
    </article>
  );
}
