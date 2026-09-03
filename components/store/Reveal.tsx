'use client';

import { useEffect, useRef, type ReactNode } from 'react';

type RevealProps = {
  children: ReactNode;
  /** Stagger within a group, in milliseconds. */
  delay?: number;
  className?: string;
};

const HIDDEN = 'reve-reveal-hidden';

/**
 * Fades content in with a short upward drift as it enters the viewport.
 *
 * The element renders visible and is hidden imperatively once the observer is
 * known to be running, so a reader without JavaScript — or with an observer
 * that never fires — never ends up looking at a blank page. Classes are
 * toggled directly rather than through state: this is a visual effect on a
 * DOM node, not data React needs to re-render for.
 */
export function Reveal({ children, delay = 0, className }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (
      typeof IntersectionObserver === 'undefined' ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return;
    }

    // Anything already on screen at mount stays put: animating content the
    // reader is already looking at reads as a glitch, not as polish.
    if (node.getBoundingClientRect().top < window.innerHeight) return;

    node.classList.add(HIDDEN);
    node.style.transitionDelay = `${delay}ms`;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            node.classList.remove(HIDDEN);
            observer.disconnect();
          }
        }
      },
      { rootMargin: '0px 0px -12% 0px', threshold: 0.05 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [delay]);

  return (
    <div className={`reve-reveal ${className ?? ''}`} ref={ref}>
      {children}
    </div>
  );
}
