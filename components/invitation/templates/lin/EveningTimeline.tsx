'use client';

import Image from 'next/image';
import { useEffect, useRef } from 'react';
import type { InvitationContent } from '@/lib/schemas/invitation';

const INK = '#3a2f22';
const GOLD = '#8a6d3a';

type ScheduleItem = InvitationContent['schedule'][number];

/**
 * Two-column zigzag timeline: illustration and text swap sides by row index,
 * strung on a center line whose dot tracks how far the visitor has scrolled
 * through the section — the interactive read of the reference's fixed mock.
 *
 * A client component, unlike the rest of Lin, because the scroll listener
 * requires it. Icons cycle through a small placeholder set by index rather
 * than mapping to specific event names, since `schedule` is arbitrary content
 * and cannot be assumed to contain an arch/couple/table/rings/dancers in that
 * order — see the Lin asset list for the real hand-drawn icons this stands in
 * for.
 */
export function EveningTimeline({ items }: { items: readonly ScheduleItem[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);

  /*
   * The dot is positioned by writing to the DOM directly rather than by
   * holding progress in state. A setState per scroll event queues a React
   * render for every frame of a scroll, and the dot visibly trails the
   * pointer; moving it here keeps it locked to the scroll position.
   */
  useEffect(() => {
    const track = trackRef.current;
    const dot = dotRef.current;
    if (!track || !dot) return;

    let frame = 0;

    const place = () => {
      frame = 0;
      const rect = track.getBoundingClientRect();
      if (rect.height === 0) return;
      const traveled = window.innerHeight / 2 - rect.top;
      const progress = Math.min(1, Math.max(0, traveled / rect.height));
      dot.style.transform = `translate(-50%, -50%) translateY(${progress * rect.height}px)`;
    };

    /* Coalesce to one write per frame: scroll fires far more often than the
       screen repaints, and the extra reads would only thrash layout. */
    const onScroll = () => {
      if (frame === 0) frame = window.requestAnimationFrame(place);
    };

    place();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (frame !== 0) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div className="relative mx-auto w-full max-w-2xl px-6">
      <div
        aria-hidden
        className="absolute top-0 left-1/2 w-px -translate-x-1/2"
        ref={trackRef}
        style={{ backgroundColor: `${INK}33`, height: '100%' }}
      >
        {/* No transition: the dot tracks the scroll position exactly, and any
            easing here reads as lag rather than as smoothing. Positioned by
            transform in the effect above. */}
        <div
          className="absolute top-0 left-1/2 h-4 w-4 rounded-full"
          ref={dotRef}
          style={{
            backgroundColor: GOLD,
            transform: 'translate(-50%, -50%)',
            /* Explicit: a project-wide `transition: all` otherwise eases every
               transform write, which reads as the dot trailing the scroll. */
            transition: 'none',
          }}
        />
      </div>

      <ul className="relative space-y-16">
        {items.map((item, index) => (
          <TimelineRow index={index} item={item} key={`${item.time}-${item.title}`} />
        ))}
      </ul>
    </div>
  );
}

function TimelineRow({ item, index }: { item: ScheduleItem; index: number }) {
  const illustrationLeft = index % 2 === 0;

  const illustration = (
    <div className="flex justify-center">
      <TimelineIcon index={index} title={item.title} />
    </div>
  );

  const text = (
    <div className={illustrationLeft ? 'text-left' : 'text-right'}>
      <p className="text-xl" style={{ fontFamily: 'var(--font-lin-script)', color: GOLD }}>
        {item.time}
      </p>
      <p className="mt-1 text-[13px] uppercase tracking-[0.14em]" style={{ color: INK }}>
        {item.title}
      </p>
      {item.description ? (
        <p className="mt-1 text-[12px]" style={{ color: `${INK}b3` }}>
          {item.description}
        </p>
      ) : null}
    </div>
  );

  return (
    <li className="grid grid-cols-2 items-center gap-6">
      {illustrationLeft ? illustration : text}
      {illustrationLeft ? text : illustration}
    </li>
  );
}

const ICONS = ['arch', 'couple', 'table', 'dancers', 'rings'] as const;

type IconKind = (typeof ICONS)[number];

/**
 * Keyword match on the event title, because position cannot tell a buffet
 * from a first dance: with five events a positional cycle put the same couple
 * figure beside both the entrance and the dancing. Falls back to cycling when
 * a title matches nothing, so an arbitrary schedule still varies.
 */
const ICON_KEYWORDS: ReadonlyArray<readonly [RegExp, IconKind]> = [
  [/arriv|welcome|guest/i, 'arch'],
  [/entrance|groom|bride|ceremon|vow/i, 'couple'],
  [/buffet|dinner|meal|food|cocktail|drink/i, 'table'],
  [/danc|party|music/i, 'dancers'],
  [/end|farewell|close|send.?off|ring|exchange/i, 'rings'],
];

function iconFor(title: string, index: number): IconKind {
  const matched = ICON_KEYWORDS.find(([pattern]) => pattern.test(title));
  return matched ? matched[1] : ICONS[index % ICONS.length];
}

function TimelineIcon({ title, index }: { title: string; index: number }) {
  const kind = iconFor(title, index);

  return (
    /* Bounded on BOTH axes, not height alone: these drawings differ in aspect
       ratio, so pinning only height let the wide rings spread far wider than
       the tall couple and read as a different scale. */
    <Image
      alt=""
      aria-hidden
      className="h-28 w-28 object-contain md:h-32 md:w-32"
      height={320}
      src={`/invitation/lin/evening/${kind}.webp`}
      width={320}
    />
  );
}
