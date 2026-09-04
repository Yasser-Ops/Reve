'use client';

import { useCallback, useRef, useState, type ReactNode } from 'react';
import { RENDER_WIDTH } from '@/components/store/TemplateThumbnail';

type TemplateCompareProps = {
  /** Rendered underneath, revealed as the handle moves left. */
  base: ReactNode;
  /** Rendered on top, clipped to the handle's position. */
  overlay: ReactNode;
  baseLabel: string;
  overlayLabel: string;
};

const MIN = 0;
const MAX = 100;
const KEYBOARD_STEP = 4;

/**
 * A draggable divider between two renderings of the same invitation.
 *
 * The point it makes is specific: both halves are the real templates fed one
 * content object, so everything that differs across the seam is art direction
 * and everything that stays put is the couple's own data. A picture of two
 * designs could not make that claim honestly.
 *
 * Implemented as a range input rather than a bare div with pointer handlers,
 * so it is keyboard operable and screen-reader labelled for free. The visible
 * handle is drawn separately and the input itself is transparent on top of it.
 */
export function TemplateCompare({
  base,
  overlay,
  baseLabel,
  overlayLabel,
}: TemplateCompareProps) {
  const [position, setPosition] = useState(50);
  const [scale, setScale] = useState(1);
  const frame = useRef<HTMLDivElement>(null);

  /* The templates are laid out at a real phone width and scaled to fit this
     frame, so the ratio has to come from the frame's measured size. A callback
     ref plus ResizeObserver keeps it right through breakpoints and rotation. */
  const measure = useCallback((node: HTMLDivElement | null) => {
    frame.current = node;
    if (!node) return;

    const observer = new ResizeObserver(([entry]) => {
      setScale(entry.contentRect.width / RENDER_WIDTH);
    });

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  /* Dragging anywhere on the frame moves the divider, which is what people
     try first. The range input keeps ownership of the value. */
  const trackPointer = useCallback((clientX: number) => {
    const box = frame.current?.getBoundingClientRect();
    if (!box) return;

    const ratio = (clientX - box.left) / box.width;
    setPosition(Math.min(MAX, Math.max(MIN, ratio * 100)));
  }, []);

  return (
    <div className="mx-auto w-full max-w-sm">
      <div
        className="relative overflow-hidden rounded-[1.75rem] border border-taupe/50 bg-bone shadow-[0_30px_60px_-30px_rgb(var(--reve-shadow-rgb)/0.5)]"
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          trackPointer(event.clientX);
        }}
        onPointerMove={(event) => {
          if (event.buttons === 1) trackPointer(event.clientX);
        }}
        ref={measure}
      >
        {/*
         * Both templates are absolutely positioned at the same origin inside
         * one aspect box, so each shows the SAME vertical slice of its own
         * design. Letting them size themselves independently would scroll each
         * to a different point and the seam would join two unrelated places in
         * the page rather than one moment in two hands.
         */}
        <div
          className="relative aspect-9/16"
          /* Both templates render at RENDER_WIDTH and are scaled to whatever
             this frame actually measures, so nothing is clipped at the edge. */
          style={{ '--thumb-scale': scale } as React.CSSProperties}
        >
          <div className="absolute inset-0 overflow-hidden">{base}</div>

          <div
            className="absolute inset-0 overflow-hidden"
            style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
          >
            {overlay}
          </div>
        </div>

        {/* The seam. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 z-20 w-px bg-bone/80 shadow-[0_0_0_1px_rgb(var(--reve-shadow-rgb)/0.25)]"
          style={{ left: `${position}%` }}
        />

        {/* The handle. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 z-20 grid h-11 w-11 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-taupe/60 bg-bone shadow-[0_6px_18px_-6px_rgb(var(--reve-shadow-rgb)/0.6)]"
          style={{ left: `${position}%` }}
        >
          <span className="reve-crisp text-[13px] leading-none text-cocoa">
            ‹›
          </span>
        </div>

        {/* Corner labels, each fading out as its own side is covered. */}
        <span
          className="reve-eyebrow pointer-events-none absolute start-4 top-4 z-20 rounded-full bg-ink/70 px-3 py-1.5 text-[9px] text-bone transition-opacity duration-200"
          style={{ opacity: position > 18 ? 1 : 0 }}
        >
          {overlayLabel}
        </span>
        <span
          className="reve-eyebrow pointer-events-none absolute end-4 top-4 z-20 rounded-full bg-ink/70 px-3 py-1.5 text-[9px] text-bone transition-opacity duration-200"
          style={{ opacity: position < 82 ? 1 : 0 }}
        >
          {baseLabel}
        </span>

        <input
          aria-label={`Reveal ${overlayLabel} over ${baseLabel}`}
          className="absolute inset-0 z-30 h-full w-full cursor-ew-resize appearance-none bg-transparent opacity-0 focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine"
          max={MAX}
          min={MIN}
          onChange={(event) => setPosition(Number(event.target.value))}
          step={KEYBOARD_STEP}
          type="range"
          value={position}
        />
      </div>

      <p className="reve-crisp mt-5 text-center text-[12px] text-cocoa">
        Drag to compare
      </p>
    </div>
  );
}
