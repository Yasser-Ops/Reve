'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { whatsappLink } from '@/lib/contact';

/**
 * Marks a region the bar must stand down for: the page's own closing call to
 * action, and the footer.
 *
 * An attribute rather than a selector list or a ref, so a page opts a section
 * out by marking it — the bar never has to know what any page is built from,
 * and a new page gets the behaviour by spelling one attribute.
 */
export const CLOSING_ATTRIBUTE = 'data-reve-closing';

/**
 * A conversion bar that rises from the foot of the page once the hero is past.
 *
 * The hero's own buttons are the primary call to action, and while they are on
 * screen this would be the same offer twice in one view. It appears only after
 * they have scrolled away, which is also when a reader is deepest in the page
 * and furthest from anything to act on.
 *
 * Watched with an IntersectionObserver against a sentinel rather than a scroll
 * listener: the question is "is the hero still visible", which is what an
 * observer answers directly, and it answers it off the main thread.
 */
export function StickyCta({
  /** WhatsApp opening line, so each page can carry its own. */
  message,
  /** Where the primary button goes, and what it says. */
  href,
  label,
}: {
  message: string;
  href: string;
  label: string;
}) {
  const [pastHero, setPastHero] = useState(false);
  const [atClosing, setAtClosing] = useState(false);
  const sentinel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = sentinel.current;
    if (!node || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      /* ABOVE the viewport, not merely off it: a hero taller than the screen
         starts with its sentinel below the fold, and that is not "past". */
      ([entry]) =>
        setPastHero(!entry.isIntersecting && entry.boundingClientRect.top < 0),
      /* Fires once the sentinel is fully gone, so the bar does not flicker in
         and out while a reader nudges the page around the boundary. */
      { threshold: 0 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  /* The page ends with its own closing call to action, and the footer carries
     the number. Once either is on screen the bar is the same offer a second
     time, laid over a better-made version of itself — and it would sit on top
     of the footer's last line. It stands down for both. */
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;

    const closing = document.querySelectorAll(`[${CLOSING_ATTRIBUTE}]`);
    if (closing.length === 0) return;

    const seen = new Set<Element>();

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) seen.add(entry.target);
          else seen.delete(entry.target);
        }
        setAtClosing(seen.size > 0);
      },
      { threshold: 0 },
    );

    for (const node of closing) observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const shown = pastHero && !atClosing;

  return (
    <>
      {/* Marks the end of the hero. Zero height, so it changes no layout. */}
      <div aria-hidden="true" className="h-px w-full" ref={sentinel} />

      <div
        /* `inert` rather than unmounting: a bar that mounts and unmounts on
           scroll moves focus and re-announces itself to a screen reader every
           time a reader crosses the boundary. Hidden, it is inert and silent;
           shown, it is an ordinary landmark. */
        aria-hidden={!shown}
        className={`fixed inset-x-0 bottom-0 z-30 border-t border-taupe/40 bg-bone/95 px-4 py-3 backdrop-blur-md transition-transform duration-500 ease-out ${
          shown ? 'translate-y-0' : 'translate-y-full'
        }`}
        inert={!shown}
      >
        <div className="mx-auto flex max-w-3xl items-center justify-center gap-3">
          <a
            aria-label="Message us on WhatsApp"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-taupe/60 text-wine transition-colors hover:bg-sand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine"
            href={whatsappLink(message)}
            rel="noreferrer noopener"
            target="_blank"
          >
            <WhatsappMark />
          </a>

          <Link
            className="reve-crisp flex-1 rounded-full bg-wine px-6 py-3.5 text-center text-[12px] uppercase tracking-[0.16em] text-bone transition-colors hover:bg-wine-deep focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-wine sm:flex-none sm:px-10"
            href={href}
          >
            {label}
          </Link>
        </div>
      </div>
    </>
  );
}

/* Inline rather than an icon dependency: one mark, one path, no package. */
function WhatsappMark() {
  return (
    <svg
      aria-hidden="true"
      fill="currentColor"
      height="19"
      viewBox="0 0 24 24"
      width="19"
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.247-.694.247-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c0-5.445 4.436-9.88 9.888-9.88a9.82 9.82 0 0 1 6.988 2.896 9.82 9.82 0 0 1 2.893 6.994c-.003 5.445-4.437 9.881-9.885 9.881m8.413-18.297A11.8 11.8 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.9 11.9 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.82 11.82 0 0 0 20.465 3.49" />
    </svg>
  );
}
