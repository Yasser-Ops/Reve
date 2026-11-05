import Image from 'next/image';
import type { ScheduleItem } from '@/lib/schemas/content/blocks';
import { LIN } from './palette';

/**
 * Two-column zigzag timeline, as in the approved mock: illustration and text
 * swap sides by row, strung on a thin centre line with a small diamond
 * ornament level with each row.
 *
 * A Server Component: the mock's line is still, so the scroll-tracking dot the
 * earlier version drew (and the listener it needed) is gone.
 *
 * Icons are picked by keyword from the event title, since `schedule` is
 * arbitrary content and cannot be assumed to list an arch, couple, table,
 * dancers and rings in that order.
 */
export function EveningTimeline({ items }: { items: readonly ScheduleItem[] }) {
  return (
    <div className="relative mx-auto w-full max-w-2xl px-6">
      <div
        aria-hidden
        className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2"
        style={{ backgroundColor: `${LIN.GOLD}80` }}
      />

      <ul className="relative space-y-14">
        {items.map((item, index) => (
          <TimelineRow index={index} item={item} key={`${item.time}-${item.title}`} />
        ))}
      </ul>
    </div>
  );
}

/* The mock's small ornament on the line: a four-point star in a ring. */
function Ornament() {
  return (
    <svg
      aria-hidden
      className="absolute top-1/2 left-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2"
      viewBox="0 0 20 20"
    >
      <circle cx="10" cy="10" fill={LIN.PAPER} r="7" />
      <path
        d="M10 2 L11.4 8.6 L18 10 L11.4 11.4 L10 18 L8.6 11.4 L2 10 L8.6 8.6 Z"
        fill="none"
        stroke={LIN.GOLD}
        strokeWidth="0.9"
      />
      <circle cx="10" cy="10" fill={LIN.GOLD} r="1.2" />
    </svg>
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
    <div className="text-center">
      <p
        className="text-[30px] leading-none"
        style={{ fontFamily: 'var(--font-lin-script)', color: LIN.GOLD }}
      >
        {item.time}
      </p>
      <p
        className="mx-auto mt-2 max-w-[11rem] text-[11px] leading-snug uppercase tracking-[0.14em]"
        style={{ color: LIN.LABEL }}
      >
        {item.title}
      </p>
      {item.description ? (
        <p className="mt-1 text-[13px]" style={{ color: LIN.INK }}>
          {item.description}
        </p>
      ) : null}
    </div>
  );

  return (
    <li className="relative grid grid-cols-2 items-center gap-10">
      {illustrationLeft ? illustration : text}
      {illustrationLeft ? text : illustration}
      <Ornament />
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
