'use client';

import { useCallback, useState, type ReactNode } from 'react';
import { RENDER_WIDTH } from '@/components/store/TemplateThumbnail';

type TemplatePreviewProps = {
  name: string;
  summary: string;
  character: readonly string[];
  /**
   * The rendered template. Passed as children rather than as a component
   * reference: a server component cannot cross the client boundary as a prop,
   * so the page renders it and this island only measures and frames it.
   */
  children: ReactNode;
};

/**
 * One design in the collection, framed and captioned.
 *
 * Client-side only because the thumbnail's scale comes from the card's
 * measured width. The template inside is ordinary server-rendered markup.
 */
export function TemplatePreview({
  name,
  summary,
  character,
  children,
}: TemplatePreviewProps) {
  const [scale, setScale] = useState(1);

  const measure = useCallback((node: HTMLDivElement | null) => {
    if (!node) return;

    const observer = new ResizeObserver(([entry]) => {
      setScale(entry.contentRect.width / RENDER_WIDTH);
    });

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <article className="group">
      <div
        className="relative aspect-9/16 overflow-hidden rounded-[1.5rem] border border-taupe/50 shadow-[0_20px_44px_-24px_rgb(var(--reve-shadow-rgb)/0.45)] transition-transform duration-300 group-hover:-translate-y-1.5"
        ref={measure}
        style={{ '--thumb-scale': scale } as React.CSSProperties}
      >
        {children}
      </div>

      <h3 className="reve-display mt-6 text-2xl">{name}</h3>

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
    </article>
  );
}
